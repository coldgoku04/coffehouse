package com.coffeehouse.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendCredentialsEmail(String toEmail, String name, String username, String temporaryPassword) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome to Cafe House - Your Account Credentials");

            String emailBody = String.format(
                    "Dear %s,\n\n" +
                            "Congratulations! Your Cafe House account has been approved.\n\n" +
                            "Here are your login credentials:\n" +
                            "----------------------------\n" +
                            "Username: %s\n" +
                            "Temporary Password: %s\n" +
                            "----------------------------\n\n" +
                            "IMPORTANT: You will be required to change your password on first login.\n\n" +
                            "Please visit: http://localhost:3000/signin\n\n" +
                            "Best regards,\n" +
                            "Cafe House Team",
                    name, username, temporaryPassword
            );
            message.setText(emailBody);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
            System.out.println(
                    "\n========== USER CREDENTIALS ==========\n" +
                            "Name: " + name + "\n" +
                            "Email: " + toEmail + "\n" +
                            "Username: " + username + "\n" +
                            "Temporary Password: " + temporaryPassword + "\n" +
                            "=====================================\n"
            );
        }
    }

    public void sendRejectionEmail(String toEmail, String name, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Cafe House Registration Update");
            String emailBody = String.format(
                    "Dear %s,\n\n" +
                            "Thank you for your interest in Cafe House.\n\n" +
                            "Unfortunately, your registration could not be approved at this time.\n\n" +
                            "Reason: %s\n\n" +
                            "If you have any questions, please contact our support team.\n\n" +
                            "Best regards,\n" +
                            "Cafe House Team",
                    name, reason
            );
            message.setText(emailBody);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send rejection email: " + e.getMessage());
        }
    }

    public void sendPasswordResetOtpEmail(String toEmail, String name, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Cafe House Password Reset OTP");
            String emailBody = String.format(
                    "Dear %s,\n\n" +
                            "We received a request to reset your Cafe House account password.\n\n" +
                            "Your OTP is: %s\n" +
                            "This OTP is valid for 10 minutes.\n\n" +
                            "If you did not request this, you can ignore this email.\n\n" +
                            "Best regards,\n" +
                            "Cafe House Team",
                    name, otp
            );
            message.setText(emailBody);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send password reset OTP email: " + e.getMessage());
        }
    }
}
