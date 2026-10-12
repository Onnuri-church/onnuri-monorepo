import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MAX_UPLOAD_BYTES, UploadsService } from './uploads.service';

// 파일 업로드 (로그인 필수) — 사진·동영상·문서. multipart 필드명은 "file" 하나. 응답 { url }의
// 주소를 각 도메인 API(셀 커버·소식 사진·갤러리·소그룹 배경·단톡방)에 그대로 넘기는 2단계 구조다.
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    // 전체 한도는 가장 큰 종류(동영상 50MB)에 맞추고, 종류별 한도는 서비스가 400으로 거른다.
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file 필드에 파일을 담아주세요.');
    return this.uploadsService.upload(file);
  }
}
