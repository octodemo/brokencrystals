import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Logger,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { W_OK } from 'constants';
import * as fs from 'fs';
import * as path from 'path';
import { Stream } from 'stream';
import { FileService } from './file.service';
import { FastifyReply } from 'fastify';

@Controller('/api/file')
@ApiTags('files controller')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private fileService: FileService) {}

  @ApiOperation({
    description:
      'Reads the file from the provided path and the supplied content type and returns the file',
  })
  @Get()
  async loadFile(
    @Query('path') path: string,
    @Query('type') contentType: string,
    @Res({ passthrough: true }) res: FastifyReply,
    @Headers('accept') acceptHeader: string,
  ) {
    let type: string;

    if (contentType) {
      type = contentType;
    } else if (acceptHeader) {
      type = acceptHeader;
    } else {
      type = 'application/octet-stream';
    }

    const file: Stream = await this.fileService.getFile(path);
    res.type(type);

    return file;
  }

  @ApiOperation({
    description: 'deletes file at the given path',
  })
  @Delete()
  async deleteFile(@Query('path') path: string): Promise<void> {
    await this.fileService.deleteFile(path);
  }

  @ApiOperation({
    description: 'save raw content on server as a file',
  })
  @Put('raw')
  async uploadFile(@Query('path') filePath: string, @Body() raw: Buffer): Promise<void> {
    const SAFE_ROOT = '/safe/root/directory';
    try {
      if (typeof raw === 'string' || Buffer.isBuffer(raw)) {
        const resolvedPath = path.resolve(SAFE_ROOT, filePath);
        if (!resolvedPath.startsWith(SAFE_ROOT)) {
          this.logger.error('Invalid file path');
          return;
        }
        await fs.promises.access(path.dirname(resolvedPath), W_OK);
        await fs.promises.writeFile(resolvedPath, raw);
      }
    } catch (err) {
      this.logger.error(err.message);
    }
  }

  @ApiOperation({
    description: 'read file content content on server as a file',
  })
  @Get('raw')
  async readFile(
    @Query('path') file,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    try {
      const stream = await this.fileService.getFile(file);
      res.type('application/octet-stream');

      return stream;
    } catch (err) {
      this.logger.error(err.message);
      res.status(HttpStatus.NOT_FOUND);
    }
  }
}
