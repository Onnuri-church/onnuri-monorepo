import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';

import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CellsService } from './cells.service';

// 게스트도 셀 목록·페이지를 열람할 수 있다 (열람 가능 범위는 ARCHITECTURE.md Access Model —
// 작성·관리 같은 동작 제한은 화면 쪽 몫). 그래서 필수 인증이 아니라 Optional 가드를 쓴다.
@Controller('cells')
export class CellsController {
  constructor(private readonly cellsService: CellsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll() {
    return this.cellsService.findAll();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const cell = await this.cellsService.findOne(id);
    if (!cell) throw new NotFoundException('존재하지 않는 셀입니다.');
    return cell;
  }
}
