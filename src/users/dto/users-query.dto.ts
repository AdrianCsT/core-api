import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UsersQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Cursor — last user ID from previous page' })
  @IsOptional()
  @IsUUID(4)
  cursor?: string;

  @ApiPropertyOptional({ description: 'Filter by name or email (partial match)' })
  @IsOptional()
  @IsString()
  search?: string;
}
