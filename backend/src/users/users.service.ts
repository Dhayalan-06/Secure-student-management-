import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

   findByEmail(email: string) {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  
  findById(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: { studentProfile: true },
    });
  }


  create(data: Partial<User>) {
    return this.repo.save(this.repo.create(data));
  }

  
  async update(id: number, data: Partial<User>) {
    const user = await this.repo.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, data);

    return this.repo.save(user);
  }
}
  

