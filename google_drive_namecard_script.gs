/**
 * [독립형] 디지털교육서포터즈 명함 구글 드라이브 자동 저장 스크립트
 * - 구글 스프레드시트 없이 https://script.google.com 에서 "새 프로젝트"로 바로 배포 가능
 * - 지정된 구글 드라이브 폴더(13BWCd8p70u9GGBEDHQBaO3ZRJL3DtD1I)에 명함 JPG 파일을 직접 저장합니다.
 */

var TARGET_FOLDER_ID = '13BWCd8p70u9GGBEDHQBaO3ZRJL3DtD1I';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'ds-namecard-drive' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var params = JSON.parse(raw);
    var folderId = params.folderId ? String(params.folderId) : TARGET_FOLDER_ID;
    var fileName = params.fileName ? String(params.fileName) : ('명함_' + Date.now() + '.jpg');
    var imageData = params.imageData ? String(params.imageData) : '';

    if (!imageData || imageData.indexOf('data:image') !== 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: '올바른 이미지 데이터가 아닙니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var mimeMatch = imageData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    var base64Data = imageData.split(',')[1];
    var folder = DriveApp.getFolderById(folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    var file = folder.createFile(blob);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileName: file.getName(),
        url: file.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
