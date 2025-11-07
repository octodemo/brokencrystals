import { Injectable, Logger } from '@nestjs/common';
import { Readable, Stream } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { CloudProvidersMetaData } from './cloud.providers.metadata';
import { R_OK } from 'constants';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private cloudProviders = new CloudProvidersMetaData();

  private readonly ROOT_DIR = path.resolve(process.cwd(), 'safe_root_directory');

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    if (file.startsWith('/')) {
      file = path.resolve(file);
    } else if (file.startsWith('http')) {
      const content = this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      file = path.resolve(this.ROOT_DIR, file);
    }

    if (!file.startsWith(this.ROOT_DIR)) {
      throw new Error('Access to the specified file is not allowed');
    }

    await fs.promises.access(file, R_OK);

    return fs.createReadStream(file);
  }

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/')) {
      file = path.resolve(file);
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      file = path.resolve(this.ROOT_DIR, file);
    }

    if (!file.startsWith(this.ROOT_DIR)) {
      throw new Error('Access to the specified file is not allowed');
    }

    await fs.promises.unlink(file);
    return true;
  }
}
