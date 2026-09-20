import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateServerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  exePath?: string;
}
