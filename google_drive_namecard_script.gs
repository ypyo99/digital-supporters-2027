/**
 * [독립형] 디지털교육서포터즈 명함 구글 드라이브 자동 저장 & Gmail 초고속 발송 스크립트
 * - 구글 스프레드시트 없이 https://script.google.com 에서 "새 프로젝트"로 바로 배포 가능
 * - 지정된 구글 드라이브 폴더(13BWCd8p70u9GGBEDHQBaO3ZRJL3DtD1I)에 명함 JPG 파일을 직접 저장합니다.
 * - FormSubmit 없이 Google 자체 GmailApp/MailApp을 통해 1초 만에 첨부파일과 함께 이메일을 즉시 발송합니다.
 */

var TARGET_FOLDER_ID = '13BWCd8p70u9GGBEDHQBaO3ZRJL3DtD1I';
var DEFAULT_EMAIL_TO = 'ypyo99@gmail.com';

/**
 * [최초 1회 필수] Gmail 발송 권한 승인용 테스트 함수
 * 1. 상단 함수 선택 드롭다운에서 'testSendMail'을 선택합니다.
 * 2. [▷ 실행] 버튼을 클릭합니다.
 * 3. 팝업창에서 [권한 검토] -> 내 계정(ypyo99@gmail.com) 선택 -> [고급] -> [이동(안전하지 않음)] -> [허용]을 누릅니다.
 * 4. 권한 승인이 완료되면 Gmail로 테스트 메일이 즉시 도착하며, 이후 웹 앱에서도 1초 만에 자동 발송됩니다.
 */
function testSendMail() {
  var email = DEFAULT_EMAIL_TO;
  var subject = '[테스트] 명함 메일 발송 권한 승인 완료';
  var body = '구글 앱스 스크립트에서 Gmail 메일 발송 권한이 정상적으로 승인되었습니다.\n이제 명함 만들기에서 메일이 1초 만에 전송됩니다!';
  GmailApp.sendEmail(email, subject, body);
  Logger.log('테스트 메일 발송 성공: ' + email);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'ds-namecard-drive-and-mail' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var params = JSON.parse(raw);
    var action = params.action ? String(params.action) : 'saveNamecard';
    var folderId = params.folderId ? String(params.folderId) : TARGET_FOLDER_ID;
    var fileName = params.fileName ? String(params.fileName) : ('명함_' + Date.now() + '.jpg');
    var imageData = params.imageData ? String(params.imageData) : '';
    var teacherName = params.teacherName ? String(params.teacherName).trim() : '디지털교육서포터즈';
    var phone = params.phone ? String(params.phone).trim() : '-';
    var slogan = params.slogan ? String(params.slogan).trim() : '-';
    var themeLabel = params.themeLabel ? String(params.themeLabel).trim() : '-';
    var emailTo = params.emailTo ? String(params.emailTo).trim() : DEFAULT_EMAIL_TO;

    if (!imageData || imageData.indexOf('data:image') !== 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: '올바른 이미지 데이터가 아닙니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var mimeMatch = imageData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var base64Data = imageData.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);

    // 1. 구글 드라이브 파일 저장
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);

    // 2. FormSubmit 없이 구글 자체 GmailApp/MailApp으로 1초 만에 직접 발송
    var emailSent = false;
    var mailError = '';
    try {
      var subject = '명함 인쇄 요청: ' + teacherName + ' 선생님';
      var textBody = '명함 인쇄 요청이 접수되었습니다.\n\n' +
        '• 선생님 성함: ' + teacherName + ' 선생님\n' +
        '• 휴대폰 번호: ' + phone + '\n' +
        '• 테마 문구: ' + slogan + '\n' +
        '• 테마 색상: ' + themeLabel + '\n' +
        '• 파일명: ' + fileName + '\n\n' +
        '첨부파일로 300DPI 인쇄용 고해상도 명함 이미지가 포함되어 있습니다.';

      var htmlBody = '<div style="font-family: \'Malgun Gothic\', sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px;">' +
        '<h2 style="color: #13386e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0;">디지털교육서포터즈 명함 인쇄 요청</h2>' +
        '<p style="color: #475569; font-size: 14px; margin-bottom: 16px;">새로운 명함 인쇄 요청이 접수되었습니다. 아래 정보 및 첨부된 고해상도 이미지(9×5cm, 300DPI)를 확인해 주세요.</p>' +
        '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px;">' +
        '<tr><td style="padding: 10px 14px; background: #f8fafc; font-weight: bold; width: 110px; border: 1px solid #e2e8f0; color: #334155;">선생님 성함</td><td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">' + teacherName + ' 선생님</td></tr>' +
        '<tr><td style="padding: 10px 14px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; color: #334155;">휴대폰 번호</td><td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + phone + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; color: #334155;">테마 문구</td><td style="padding: 10px 14px; border: 1px solid #e2e8f0; white-space: pre-line;">' + slogan + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; color: #334155;">이미지 색상</td><td style="padding: 10px 14px; border: 1px solid #e2e8f0;">' + themeLabel + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; color: #334155;">파일명</td><td style="padding: 10px 14px; border: 1px solid #e2e8f0; font-family: monospace;">' + fileName + '</td></tr>' +
        '</table>' +
        '<p style="color: #64748b; font-size: 13px; margin-top: 12px;">※ 고해상도 명함 이미지가 첨부파일로 포함되어 있습니다.</p>' +
        '</div>';

      var mailOptions = {
        htmlBody: htmlBody,
        attachments: [file.getBlob()]
      };

      try {
        GmailApp.sendEmail(emailTo, subject, textBody, mailOptions);
        emailSent = true;
      } catch (gErr) {
        console.warn('GmailApp 실패, MailApp 시도:', gErr);
        MailApp.sendEmail(emailTo, subject, textBody, mailOptions);
        emailSent = true;
      }
    } catch (mailErr) {
      mailError = (mailErr && mailErr.message) ? mailErr.message : String(mailErr);
      console.error('메일 발송 오류:', mailErr);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileName: file.getName(),
        url: file.getUrl(),
        emailSent: emailSent,
        mailError: mailError || undefined
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
