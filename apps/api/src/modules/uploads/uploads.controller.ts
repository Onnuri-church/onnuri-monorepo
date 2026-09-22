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
import { UploadsService } from './uploads.service';

// 이미지 업로드 (로그인 필수) — multipart 필드명은 "file" 하나. 응답 { url }의 주소를
// 각 도메인 API(셀 커버·소식 사진·갤러리·소그룹 배경)에 그대로 넘기는 2단계 구조다.
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    // 10MB 제한 — 폰 카메라 원본도 들어오게 넉넉히. 초과하면 multer가 413을 돌려준다.
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file 필드에 이미지를 담아주세요.');
    return this.uploadsService.upload(file);
  }
}
