import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { gCalendar } from 'src/types/gcal';

@Injectable()
export class GCalAuthService {
  async getClient(userId: string): Promise<gCalendar> {
    const oauth2Client = await this.createOAuth2Client(userId);
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  private async createOAuth2Client(userId: string): Promise<OAuth2Client> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    const tokens = await this.getTokensForUser(userId);
    oauth2Client.setCredentials(tokens);

    return oauth2Client;
  }

  private async getTokensForUser(userId: string) {
    // TODO implement token retrieval
    return {
      access_token: 'mock-access-token' + userId,
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600000, // 1 hour from now
    };
  }
}
