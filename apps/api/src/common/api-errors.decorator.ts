import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }],
    description: 'A message, or the list of validation failures',
  })
  message!: string | unknown[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}

const DESCRIPTIONS: Record<number, string> = {
  400: 'Invalid input',
  401: 'Not authenticated',
  404: 'Not found',
  409: 'Conflict',
  429: 'Too many requests (see Retry-After)',
};

/** Declares the error statuses an endpoint can answer with, each with the shared error body. */
export function ApiErrors(...statuses: number[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, description: DESCRIPTIONS[status] ?? 'Error', type: ErrorResponseDto }),
    ),
  );
}