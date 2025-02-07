import { Request, Response } from "express";
import Smtp from "../models/smtp.js";
import nodemailer from 'nodemailer';
import { encrypt, decrypt } from "../utils/encryption.js";
import { getSmtp } from "../utils/getSmtp.js";
import { tokenGenerator, decodeToken } from "../utils/tokenGenerator.js";
import sendEmail from "../utils/sendEmail.js";

const createSmtp = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { name, fromEmail, service, pool, host, port, secure, auth } = req.body;

        const userId = req.userId;

        const newSmtp = new Smtp({
            name,
            fromEmail,
            service,
            pool,
            host,
            port,
            secure,
            auth,
            createdBy: userId,
        });

        await newSmtp.save();

        return res.status(201).json({ message: "SMTP configuration created successfully, Please Proceed to test your smtp so that you can start using it", smtp: newSmtp });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const getAllSmtps = async (req: Request, res: Response): Promise<Response> => {
    try {
        const smtps = await Smtp.find();
        return res.status(200).json({ smtps });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const getSingleSmtp = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.userId;

        const smtp = await Smtp.findOne({ _id: req.params.id, createdBy: userId });

        if (!smtp) {
            return res.status(404).json({ error: "SMTP configuration not found" });
        }
        smtp.auth.pass = await decrypt(smtp.auth.pass);

        // console.log(smtp.auth.pass);


        return res.status(200).json({ smtp });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const updateSmtp = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.userId;
        const { auth, ...updateData } = req.body;

        const updatedSmtp = await Smtp.findOneAndUpdate(
            { _id: req.params.id, createdBy: userId },
            updateData,
            { new: true }
        );

        if (!updatedSmtp) {
            return res.status(404).json({ error: "SMTP configuration not found" });
        }

        return res.status(200).json({ message: "SMTP configuration updated successfully", smtp: updatedSmtp });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const updateAuthSmtp = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.userId;
        const { user, pass } = req.body.auth;

        const smtp = await Smtp.findOne({ _id: req.params.id, createdBy: userId });

        if (!smtp) {
            return res.status(404).json({ error: "SMTP configuration not found" });
        }

        smtp.auth.user = user;
        smtp.auth.pass = pass;
        smtp.isTested = false;

        await smtp.save();

        return res.status(200).json({ message: "SMTP auth updated successfully", smtp });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const deleteSmtp = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.userId;

        const deletedSmtp = await Smtp.findOneAndDelete({ _id: req.params.id, createdBy: userId });

        if (!deletedSmtp) {
            return res.status(404).json({ error: "SMTP configuration not found" });
        }

        return res.status(200).json({ message: "SMTP configuration deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const getUserSmtps = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.userId;
        const smtps = await Smtp.find({ createdBy: userId });
        return res.status(200).json({ smtps });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
};

const sendSmtpVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { smtpId, email } = req.body;
        const userId = req.userId;

        if (!smtpId || !email) {
            res.status(400).json({ error: "SMTP ID and email are required." });
            return;
        }

        const smtp = await getSmtp(smtpId);
        console.log({ smtp, userId });

        if (!smtp || smtp.createdBy.toString() !== userId) {
            res.status(404).json({ error: "SMTP configuration not found." });
            return;
        }

        const token = tokenGenerator({ smtpId: smtp._id, userId });

        let transporterOptions: any;

        if (smtp.service === 'gmail') {
            transporterOptions = {
                service: 'gmail',
                auth: {
                    user: smtp.auth.user,
                    pass: smtp.auth.pass,
                },
            };
        } else {
            transporterOptions = {
                service: smtp.service,
                pool: smtp.pool,
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: {
                    user: smtp.auth.user,
                    pass: smtp.auth.pass,
                },
            };
        }

        const transporter = nodemailer.createTransport(transporterOptions);

        const subject = `Please verify your SMTP settings`;
        const content = `
                        <html>
                        <head>
                        <style>
                            body {
                            font-family: 'Arial', sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f6f8;
                            color: #333;
                            }
                            .container {
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #ffffff;
                            border-radius: 8px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                            }
                            .header {
                            background-color: #007BFF;
                            padding: 20px;
                            color: #ffffff;
                            text-align: center;
                            border-top-left-radius: 8px;
                            border-top-right-radius: 8px;
                            }
                            .header h1 {
                            margin: 0;
                            font-size: 24px;
                            }
                            .content {
                            padding: 20px;
                            text-align: left;
                            color: #333;
                            font-size: 16px;
                            line-height: 1.6;
                            }
                            .content p {
                            margin: 0 0 15px;
                            }
                            .content a {
                            color: #007BFF;
                            text-decoration: none;
                            font-weight: bold;
                            }
                            .content a:hover {
                            text-decoration: underline;
                            }
                            .footer {
                            margin-top: 30px;
                            text-align: center;
                            font-size: 14px;
                            color: #777;
                            }
                            .footer p {
                            margin: 5px 0;
                            }
                            .footer a {
                            color: #007BFF;
                            text-decoration: none;
                            }
                            .footer a:hover {
                            text-decoration: underline;
                            }
                            /* Responsive styling */
                            @media (max-width: 768px) {
                            .container {
                                padding: 15px;
                            }
                            .header h1 {
                                font-size: 20px;
                            }
                            .content p {
                                font-size: 16px;
                            }
                            }
                        </style>
                        </head>
                        <body>
                        <div class="container">
                            <div class="header">
                            <h1>Verify Your SMTP Settings</h1>
                            </div>
                            <div class="content">
                            <p>Hello,</p>
                            <p>
                                We have received a request to verify your SMTP settings. Please click the link below to verify your SMTP configuration:
                            </p>
                            <p>
                                <a href="${process.env.BASE_URL}/smtps/verify/${token}" target="_blank">
                                Verify SMTP Settings
                                </a>
                            </p>
                            <p>If you did not request this verification, please ignore this email.</p>
                            <p>Thank you,<br/>The DercedGroup Team</p>
                            </div>
                            <div class="footer">
                            <p><strong>DercedGroup Ltd</strong></p>
                            <p>Located: Kigali, Gasabo, Gacuriro</p>
                            <p>&copy; ${new Date().getFullYear()} DercedGroup Ltd. All rights reserved.</p>
                            <p><a href="https://DercedGroup.com" target="_blank">Visit Our Website</a></p>
                            </div>
                        </div>
                        </body>
                        </html>
                        `;

        const mailOptions: nodemailer.SendMailOptions = {
            from: smtp.fromEmail,
            to: email,
            subject,
            html: content,
        };

        const info = await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Verification email sent successfully.", info });
    } catch (error) {
        console.error("Error sending SMTP verification email:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message || "Failed to send verification email." });
        } else {
            res.status(500).json({ error: "An unexpected error occurred." });
        }
    }
};

const verifySmtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params;

        if (!token) {
            res.status(400).json({ error: "Token is required." });
            return;
        }

        const decoded = decodeToken(token);

        if (!decoded) {
            res.status(400).json({ error: "Invalid or expired token." });
            return;
        }

        const smtpId = decoded.smtpId;

        const smtp = await getSmtp(smtpId);

        const updatedSmtp = await Smtp.findByIdAndUpdate(smtpId, {
            isTested: true,
            lastTested: new Date()
        }, { new: true });

        if (!updatedSmtp) {
            res.status(500).json({ error: "Failed to update SMTP configuration." });
            return;
        }

        res.status(200).json({ message: "SMTP successfully verified", smtp: updatedSmtp });
    } catch (error) {
        console.error("Error verifying SMTP:", error);
        if (error instanceof Error) {
            res.status(500).json({ error: error.message || "Failed to verify SMTP configuration." });
        } else {
            res.status(500).json({ error: "An unexpected error occurred." });
        }
    }
};

export { createSmtp, getAllSmtps, getSingleSmtp, updateSmtp, deleteSmtp, getUserSmtps, sendSmtpVerification, verifySmtp, updateAuthSmtp };
