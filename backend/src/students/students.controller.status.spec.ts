import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request = require('supertest');
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController HTTP status codes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: {
            list: jest.fn(async () => ({
              data: [],
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            })),  
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = { id: 1 };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /students success aana 200 status return pannanum', async () => {
    const response = await request(app.getHttpServer())
      .get('/students')
      .expect(200);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
