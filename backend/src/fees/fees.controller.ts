import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeStatusDto } from './dto/update-fee-status.dto';
import { FeesService } from './fees.service';

@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  list(@Req() request: any) {
    return this.fees.list(request.user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFeeDto) {
    return this.fees.create(dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeeStatusDto,
  ) {
    return this.fees.updateStatus(id, dto.status);
  }
}
