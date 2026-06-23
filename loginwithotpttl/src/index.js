import express from "express";
import Redis from "ioredis";

const app = express();

// Middleware
app.use(express.json());

// Redis Connection
const redis = new Redis({
    host: "127.0.0.1",
    port: 6379
});

// Redis Events
redis.on("connect", () => {
    console.log("✅ Redis Connected");
});

redis.on("error", (err) => {
    console.error("❌ Redis Error:", err);
});

// OTP Key Generator
function otpKey(phone) {
    return `otp:${phone}`;
}

/*
|--------------------------------------------------------------------------
| Send OTP
|--------------------------------------------------------------------------
*/
app.post("/otp", async (req, res) => {
    try {

        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Generate 6 Digit OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // Save OTP for 30 Seconds
        await redis.set(
            otpKey(phone),
            otp,
            "EX",
            30
        );

        return res.json({
            success: true,
            message: "OTP Sent Successfully",
            otp
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

/*
|--------------------------------------------------------------------------
| Verify OTP
|--------------------------------------------------------------------------
*/
app.post("/otp/verify", async (req, res) => {
    try {

        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone and OTP are required"
            });
        }

        const savedOTP = await redis.get(
            otpKey(phone)
        );

        if (!savedOTP) {
            return res.status(400).json({
                success: false,
                message: "OTP Expired or Not Found"
            });
        }

        if (savedOTP !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // Delete OTP after successful verification
        await redis.del(
            otpKey(phone)
        );

        return res.json({
            success: true,
            message: "OTP Verified Successfully"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

/*
|--------------------------------------------------------------------------
| Check OTP TTL
|--------------------------------------------------------------------------
*/
app.get("/otp/:phone/ttl", async (req, res) => {
    try {

        const phone = req.params.phone;

        const ttl = await redis.ttl(
            otpKey(phone)
        );

        return res.json({
            success: true,
            phone,
            ttl
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "OTP API Running"
    });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});