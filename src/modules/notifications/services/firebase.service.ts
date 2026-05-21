// Libraries
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as Sentry from '@sentry/node';

// Services
import { RetryService } from '@/common/services/retry.service';

/**
 * Firebase Service
 *
 * Service for sending push notifications via Firebase Cloud Messaging (FCM).
 * Uses Firebase Admin SDK for server-side push notification sending.
 *
 * Features:
 * - Firebase Admin SDK initialization
 * - Push notification sending (iOS and Android)
 * - Error handling (invalid tokens, network errors)
 * - Optional feature: Skip if FIREBASE_ENABLED=false
 * - Sentry error tracking
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;
  private readonly enabled: boolean;
  private readonly firebaseRetryMaxAttempts: number;
  private readonly firebaseRetryBaseDelay: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly retryService: RetryService,
  ) {
    // Check if Firebase is enabled
    this.enabled = process.env.FIREBASE_ENABLED === 'true';

    // Load retry configuration
    this.firebaseRetryMaxAttempts = this.configService.get<number>('FIREBASE_RETRY_MAX_ATTEMPTS', 5);
    this.firebaseRetryBaseDelay = this.configService.get<number>('FIREBASE_RETRY_BASE_DELAY', 2000);

    if (!this.enabled) {
      this.logger.warn('Firebase push notifications disabled (FIREBASE_ENABLED=false)');
    }
  }

  /**
   * Initialize Firebase Admin SDK on module initialization
   * Called automatically by NestJS when module is loaded
   */
  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Skipping Firebase initialization (disabled)');
      return;
    }

    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      // Validate required environment variables
      if (!projectId || !privateKey || !clientEmail) {
        this.logger.warn('Firebase environment variables missing. Push notifications will be disabled.');
        this.logger.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
        return;
      }

      // Parse private key (handle escaped newlines)
      const parsedPrivateKey = privateKey.replace(/\\n/g, '\n');

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: parsedPrivateKey,
          clientEmail,
        }),
      });

      this.logger.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK:',
        error instanceof Error ? error.message : String(error),
      );

      // Log to Sentry
      try {
        Sentry.captureException(error, {
          tags: {
            module: 'FirebaseService',
            action: 'initialization',
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }
    }
  }

  /**
   * Send push notification to device
   *
   * @param deviceToken FCM device token
   * @param title Notification title
   * @param body Notification body/message
   * @param data Optional data payload (key-value pairs)
   * @returns Promise resolving to void
   * @throws Error if Firebase not initialized or invalid token
   */
  async sendPush(deviceToken: string, title: string, body: string, data?: object): Promise<void> {
    // Check if Firebase is enabled
    if (!this.enabled) {
      this.logger.debug('Firebase push notifications disabled, skipping sendPush');
      return;
    }

    // Check if Firebase is initialized
    if (!this.firebaseApp) {
      const errorMessage = 'Firebase Admin SDK not initialized. Check environment variables.';
      this.logger.error(errorMessage);

      // Log to Sentry
      try {
        Sentry.captureException(new Error(errorMessage), {
          tags: {
            module: 'FirebaseService',
            action: 'sendPush',
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }

      throw new Error(errorMessage);
    }

    try {
      // Prepare message payload
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data: data
          ? Object.entries(data).reduce(
              (acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
        // Support both iOS and Android
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        android: {
          priority: 'high',
        },
      };

      this.logger.debug(`Sending push notification to device: ${deviceToken.substring(0, 20)}...`);

      // Send push notification with retry
      const response = await this.retryService.executeWithRetry(
        async () => {
          // Check for non-retryable errors before sending
          try {
            return await admin.messaging().send(message);
          } catch (error: any) {
            // Error classification: Don't retry on validation errors
            if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/invalid-argument') {
              // Throw immediately to skip retry
              throw error;
            }
            // Let RetryService handle retryable errors (network, server errors)
            throw error;
          }
        },
        {
          maxAttempts: this.firebaseRetryMaxAttempts,
          baseDelay: this.firebaseRetryBaseDelay,
          context: `Firebase Notification: ${deviceToken.substring(0, 20)}...`,
        },
      );

      this.logger.log(`Push notification sent successfully (messageId: ${response})`);
    } catch (error: any) {
      // Handle Firebase-specific errors
      if (error.code === 'messaging/invalid-registration-token') {
        this.logger.warn(`Invalid device token: ${deviceToken.substring(0, 20)}...`);

        // Log to Sentry with token prefix (not full token for security)
        try {
          Sentry.captureException(error, {
            tags: {
              module: 'FirebaseService',
              action: 'sendPush',
              errorType: 'invalid-token',
            },
            extra: {
              tokenPrefix: deviceToken.substring(0, 20),
            },
          });
        } catch (sentryError) {
          this.logger.warn('Failed to capture exception in Sentry:', sentryError);
        }

        // Re-throw to allow caller to handle (e.g., mark token as inactive)
        throw new Error('Invalid device token');
      }

      // Handle network errors
      if (error.code === 'messaging/unavailable') {
        this.logger.error('Firebase service unavailable:', error.message);

        // Log to Sentry
        try {
          Sentry.captureException(error, {
            tags: {
              module: 'FirebaseService',
              action: 'sendPush',
              errorType: 'service-unavailable',
            },
          });
        } catch (sentryError) {
          this.logger.warn('Failed to capture exception in Sentry:', sentryError);
        }

        // Re-throw to allow caller to handle
        throw new Error('Firebase service unavailable');
      }

      // Handle other errors
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);

      // Log to Sentry
      try {
        Sentry.captureException(error, {
          tags: {
            module: 'FirebaseService',
            action: 'sendPush',
            errorType: 'unknown',
          },
        });
      } catch (sentryError) {
        this.logger.warn('Failed to capture exception in Sentry:', sentryError);
      }

      // Re-throw to allow caller to handle
      throw error;
    }
  }
}
