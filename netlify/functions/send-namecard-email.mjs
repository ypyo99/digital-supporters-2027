import nodemailer from 'nodemailer';

const RECIPIENT_EMAIL = 'ypyo99@gmail.com';
const CANONICAL_ORIGIN = 'https://digital-supporters-2027.netlify.app';

const formatTeacherDisplayName = (rawName = '') => {
  const trimmed = String(rawName || '').trim() || '디지털교육서포터즈';
  return trimmed.replace(/\s*선생님\s*$/, '').trim() || '디지털교육서포터즈';
};

export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      fileName = '명함.jpg',
      dataUrl = '',
      teacherName = '',
      phone = '',
      slogan = '',
      themeLabel = ''
    } = payload;

    const match = String(dataUrl).match(/^data:(image\/(?:jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: '올바른 명함 이미지 데이터가 아닙니다.' })
      };
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const cleanTeacher = formatTeacherDisplayName(teacherName);
    const subject = `명함 인쇄 요청: ${cleanTeacher} 선생님`;
    const safeFileName = String(fileName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || `${cleanTeacher}_디지털교육서포터즈_명함(9x5cm).jpg`;

    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD || '';
    const gmailUser = process.env.GMAIL_USER || RECIPIENT_EMAIL;

    if (gmailAppPassword) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword
        }
      });

      const html = `
        <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #1e293b; max-width: 640px; line-height: 1.6;">
          <h2 style="margin: 0 0 12px 0; color: #0f294a;">${subject}</h2>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            디지털교육서포터즈 명함(9x5cm, 300DPI) 인쇄 요청이 접수되었습니다.
          </p>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 18px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700; width: 110px;">선생님 성함</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${cleanTeacher} 선생님</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700;">휴대폰 번호</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${phone || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700;">테마 문구</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${slogan || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700;">이미지 색상</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${themeLabel || '-'}</td>
            </tr>
          </table>
          <div style="margin-top: 12px;">
            <p style="margin: 0 0 8px 0; font-weight: 700; font-size: 13px; color: #334155;">[명함 이미지 미리보기 및 첨부파일]</p>
            <img src="cid:namecard_inline" alt="${safeFileName}" style="max-width: 560px; width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 10px; display: block;" />
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"디지털교육서포터즈 명함" <${gmailUser}>`,
        to: RECIPIENT_EMAIL,
        subject,
        text: `${subject}\n\n선생님 성함: ${cleanTeacher} 선생님\n휴대폰 번호: ${phone || '-'}\n테마 문구: ${slogan || '-'}\n이미지 색상: ${themeLabel || '-'}\n\n첨부된 명함 이미지(${safeFileName})를 확인해 주세요.`,
        html,
        attachments: [
          {
            filename: safeFileName,
            content: buffer,
            contentType: mimeType,
            cid: 'namecard_inline'
          }
        ]
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: true,
          method: 'smtp',
          to: RECIPIENT_EMAIL,
          subject,
          needsActivation: false
        })
      };
    }

    // FormSubmit multipart/form-data 발송 (첨부파일 포함)
    const fd = new FormData();
    fd.append('_subject', subject);
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    fd.append('선생님_성함', `${cleanTeacher} 선생님`);
    fd.append('휴대폰_번호', phone || '-');
    fd.append('테마_문구', slogan || '-');
    fd.append('이미지_색상', themeLabel || '-');
    fd.append('attachment', new Blob([buffer], { type: mimeType }), safeFileName);

    const fsRes = await fetch(`https://formsubmit.co/${RECIPIENT_EMAIL}`, {
      method: 'POST',
      headers: {
        Origin: CANONICAL_ORIGIN,
        Referer: `${CANONICAL_ORIGIN}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      },
      body: fd
    });

    const fsText = await fsRes.text();
    const needsActivation = /Activate Form|needs Activation|activation/i.test(fsText);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: fsRes.ok,
        method: 'formsubmit',
        to: RECIPIENT_EMAIL,
        subject,
        needsActivation
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: err?.message || '이메일 발송 중 오류가 발생했습니다.'
      })
    };
  }
};
