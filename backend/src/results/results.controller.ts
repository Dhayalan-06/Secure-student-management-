import { Body, Controller, Get, Header, HttpCode, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SaveMarkDto } from './dto/save-mark.dto';
import { ResultsService } from './results.service';
import { RegistrationNumberDto } from '../students/dto/registration-number.dto';

@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Post('lookup')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.STAFF)
  lookup(@Req() req: any, @Body() dto: RegistrationNumberDto) {
    return this.results.lookup(req.user, dto.registrationNumber);
  }

  @Get('subjects')
  listSubjects(@Query('semester', new ParseIntPipe({ optional: true })) semester?: number) {
    return this.results.listSubjects(semester);
  }

  @Post('subjects')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.results.createSubject(dto);
  }

  @Get('marks')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  listMarks(
    @Req() req: any,
    @Query('semester', new ParseIntPipe({ optional: true })) semester?: number,
    @Query('studentId', new ParseIntPipe({ optional: true })) studentId?: number,
  ) {
    return this.results.listMarks(req.user, semester, studentId);
  }

  @Post('marks')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  saveMark(@Req() req: any, @Body() dto: SaveMarkDto) {
    return this.results.saveMark(req.user, dto);
  }
}
