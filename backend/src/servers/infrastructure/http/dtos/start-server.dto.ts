import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class StartServerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  port: number;
}
