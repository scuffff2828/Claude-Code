import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const data = req.body;
    
    // Developer Mode Check
    const isDeveloperMode = data.first_name === 'Seyyid' && data.last_name === 'Mustafa';
    if (isDeveloperMode) {
      console.log('🚀 DEVELOPER MODE ACTIVATED');
      data.developer_mode = 'true';
    } else {
      data.developer_mode = 'false';
    }
    
    // Add submission metadata
    data.submission_id = `IRPro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    data.submitted_at = new Date().toLocaleString('de-DE');

    // PDF generieren
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("🏥 IRPro - Patient Intake Assessment", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${data.submitted_at}`, 105, 30, { align: 'center' });
    doc.text(`Submission ID: ${data.submission_id}`, 105, 35, { align: 'center' });
    
    // Developer Mode indicator
    if (isDeveloperMode) {
      doc.setFillColor(255, 107, 107);
      doc.rect(20, 40, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('🚀 DEVELOPER MODE - Test Data', 105, 47, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    
    // Content
    let yPosition = isDeveloperMode ? 60 : 50;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'submission_id' && key !== 'submitted_at' && value) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${key}:`, 20, yPosition);
        doc.setFont('helvetica', 'normal');
        
        // Handle long values
        const valueStr = String(value);
        if (valueStr.length > 50) {
          const splitText = doc.splitTextToSize(valueStr, 120);
          doc.text(splitText, 70, yPosition);
          yPosition += splitText.length * 5;
        } else {
          doc.text(valueStr, 70, yPosition);
          yPosition += 8;
        }
        
        // New page if needed
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
      }
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('IRPro - Professional Immunization Assessment by JoeyDirt333', 105, 290, { align: 'center' });
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // JSON generieren
    const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2), "utf8");

    // Gmail-Transporter
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email versenden
    await transporter.sendMail({
      from: `"IRPro Assessment" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: `${isDeveloperMode ? '🚀 [DEV TEST] ' : '🏥 '}IRPro Assessment - ${data.first_name} ${data.last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          ${isDeveloperMode ? '<div style="background: #ff6b6b; color: white; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 20px;"><strong>🚀 DEVELOPER MODE TEST</strong></div>' : ''}
          
          <h2 style="color: #000;">🏥 New IRPro Assessment Received</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>👤 Patient Information:</h3>
            <p><strong>Name:</strong> ${data.first_name} ${data.last_name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Assessment Type:</strong> ${data.assessment_type}</p>
            <p><strong>Date of Birth:</strong> ${data.date_of_birth}</p>
          </div>
          
          <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4>📎 Attachments:</h4>
            <ul>
              <li><strong>PDF Report:</strong> IRPro-Assessment-${data.first_name}-${data.last_name}.pdf</li>
              <li><strong>JSON Data:</strong> IRPro-Assessment-${data.first_name}-${data.last_name}.json</li>
            </ul>
            <p><strong>🆔 Submission ID:</strong> ${data.submission_id}</p>
            <p><strong>🚀 Developer Mode:</strong> ${data.developer_mode}</p>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #6c757d; font-size: 0.9em;">
            <strong>IRPro</strong> - Automated via Vercel Functions<br>
            Professional Immunization Assessment by JoeyDirt333
          </p>
        </div>
      `,
      attachments: [
        { 
          filename: `IRPro-Assessment-${data.first_name}-${data.last_name}.pdf`, 
          content: pdfBuffer 
        },
        { 
          filename: `IRPro-Assessment-${data.first_name}-${data.last_name}.json`, 
          content: jsonBuffer 
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: "E-Mail mit PDF und JSON gesendet",
      submissionId: data.submission_id,
      developerMode: isDeveloperMode
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.toString()
    });
  }
}