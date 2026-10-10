import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CellsService } from './cells.service';
import { AddCellMembersDto } from './dto/add-cell-members.dto';
import { CreateCellDto } from './dto/create-cell.dto';
import { UpdateCellDto } from './dto/update-cell.dto';

// 게스트도 셀 목록·페이지를 열람할 수 있다 (열람 가능 범위는 ARCHITECTURE.md Access Model —
// 작성·관리 같은 동작 제한은 화면 쪽 몫). 그래서 조회는 필수 인증이 아니라 Optional 가드를 쓴다.
// 생성/수정/삭제와 셀원 추가·제거는 모두 관리자 전용이다 (셀장은 목록만 본다).
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCellDto) {
    return this.cellsService.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCellDto) {
    return this.cellsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cellsService.softDelete(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/members')
  addMembers(@Param('id') id: string, @Body() dto: AddCellMembersDto) {
    return this.cellsService.addMembers(id, dto.userIds);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.cellsService.removeMember(id, userId);
  }
}
