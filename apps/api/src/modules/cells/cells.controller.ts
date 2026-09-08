import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CellsService } from './cells.service';

@Controller('cells')
export class CellsController {
  constructor(private readonly cellsService: CellsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.cellsService.findAll();
  }
}
