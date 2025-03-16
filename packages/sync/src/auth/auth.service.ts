import Session from 'supertokens-node/recipe/session';
import { Injectable } from '@nestjs/common';
import { SyncError } from '@common/errors/sync.errors';
import { error } from '@common/errors/error.handler';
import { AuthRepository } from './auth.repository';
import { canDoIncrementalSync } from 'src/util/sync.util';
import { SyncRepository } from '../repositories/sync.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly syncRepository: SyncRepository,
  ) {}

  determineAuthMethod = async (gUserId: string) => {
    const user = await this.authRepository.findUserBy(
      'google.googleId',
      gUserId,
    );

    if (!user) {
      return { authMethod: 'signup', user: null };
    }
    const userId = user._id.toString();

    const sync = await this.syncRepository.findSync({ userId });
    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        'Did not verify sync record for user',
      );
    }

    const canLogin = canDoIncrementalSync(sync);
    const authMethod = user && canLogin ? 'login' : 'signup';

    return { authMethod, user };
  };

  /**
   * Revokes all sessions for a user
   * Used when tokens are invalid or user access is revoked
   */
  async revokeSessionsByUser(
    userId: string,
  ): Promise<{ sessionsRevoked: number }> {
    const sessionsRevoked = await Session.revokeAllSessionsForUser(userId);
    return { sessionsRevoked: sessionsRevoked.length };
  }
}
