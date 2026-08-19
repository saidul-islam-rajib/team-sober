import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountsService } from './accounts.service';
import { AccountSessionService } from './account-session.service';
import { AccountResetService } from './account-reset.service';
import { AccountRecoveryRequestService } from './account-recovery-request.service';
import { CurrentAccountService } from './current-account.service';
import { PasswordTokenService } from './password-token.service';
import { TokenPurpose } from './password-token.model';
import { AccountRoutes } from './account.routes';
import { Account } from './account.model';
import type {
  ForgotInput,
  NextTarget,
  RecoveryInput,
  RecoveryRequestInput,
  RegisterInput,
  SetPasswordInput,
} from './account.dto';
import { describeAccount } from './account.dto';
import {
  forgotProblem,
  normaliseEmail,
  recoveryRequestProblem,
  registrationProblem,
  resetProblem,
  setPasswordProblem,
} from './account.rules';
import {
  accountPage,
  checkEmailPage,
  recoverPage,
  registerPage,
  resetPage,
  setPasswordPage,
  signInPage,
} from '../views/public/account.pages';
import { CertificatesService } from '../tutorials/certificates.service';
import { LoginThrottleService } from '../auth/login-throttle.service';
import { TutorialsService } from '../tutorials/tutorials.service';
import { ProgressService } from '../tutorials/progress.service';
import { MailerService } from '../shared/mail/mailer.service';
import {
  passwordResetEmail,
  passwordSetupEmail,
} from '../shared/mail/mail.templates';
import { AccountPolicy } from '../shared/config/policies';
import { getSettings } from '../settings/settings.store';

@Controller('account')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly session: AccountSessionService,
    private readonly current: CurrentAccountService,
    private readonly tokens: PasswordTokenService,
    private readonly resets: AccountResetService,
    private readonly requests: AccountRecoveryRequestService,
    private readonly certificates: CertificatesService,
    private readonly tutorials: TutorialsService,
    private readonly progress: ProgressService,
    private readonly throttle: LoginThrottleService,
    private readonly mailer: MailerService,
  ) {}

  private clientIp(req: Request): string {
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  private throttleKey(req: Request): string {
    return `account:${this.clientIp(req)}`;
  }

  private linkKey(req: Request): string {
    return `password-link:${this.clientIp(req)}`;
  }

  private requestKey(req: Request): string {
    return `recovery-request:${this.clientIp(req)}`;
  }

  private safeNext(next?: string): string {
    return next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : AccountRoutes.home.template;
  }

  private waitMessage(waitMs: number): string {
    const minutes = Math.max(1, Math.ceil(waitMs / 60000));

    return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }

  private baseUrl(req: Request): string {
    const configured = (getSettings().siteUrl || '').replace(/\/+$/, '');
    if (configured) return configured;

    const forwarded = req.headers['x-forwarded-proto'];
    const proto =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0] ??
      req.protocol ??
      'http';

    return `${proto}://${req.headers.host ?? 'localhost'}`;
  }

  private passwordLink(req: Request, token: string, next?: string): string {
    const base = `${this.baseUrl(req)}${AccountRoutes.setPassword.template}?token=${token}`;

    return next && next.startsWith('/') && !next.startsWith('//')
      ? `${base}&next=${encodeURIComponent(next)}`
      : base;
  }

  private async sendPasswordLink(
    req: Request,
    account: Account,
    purpose: TokenPurpose,
    next?: string,
  ): Promise<{ failed: boolean }> {
    const { token } = this.tokens.issue(
      account.id,
      purpose,
      this.clientIp(req),
    );

    const link = this.passwordLink(req, token, next);
    const minutes = AccountPolicy.passwordLinkMinutes;

    const build =
      purpose === TokenPurpose.Reset ? passwordResetEmail : passwordSetupEmail;

    const delivery = await this.mailer.send({
      ...build({ name: account.name, link, minutes }),
      to: account.email,
    });

    return { failed: !delivery.ok };
  }

  private homePage(
    account: Account,
    extra: { error?: string; linkSent?: boolean } = {},
  ): string {
    const certificates = this.certificates
      .forAccount(account.id)
      .flatMap((record) => {
        const subject = this.tutorials
          .findSubjects()
          .find((candidate) => candidate.id === record.subjectId);

        return subject
          ? [
              {
                course: subject.title,
                href: `/tutorials/${subject.slug}/certificate`,
                issued: new Date(record.issuedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              },
            ]
          : [];
      });

    const courses = this.tutorials.findSubjects().flatMap((subject) => {
      const lessonIds = this.tutorials
        .lessons(subject.id)
        .map((lesson) => lesson.id);
      const done = this.progress.countOf(account.id, lessonIds);

      return done > 0 && done < lessonIds.length
        ? [
            {
              title: subject.title,
              href: `/tutorials/${subject.slug}`,
              done,
              total: lessonIds.length,
            },
          ]
        : [];
    });

    return accountPage({
      account: describeAccount(account),
      certificates,
      courses,
      hasPassword: Boolean(account.secret),
      ...extra,
    });
  }

  @Get()
  @Header('Content-Type', 'text/html')
  home(@Req() req: Request, @Res() res: Response): void {
    const account = this.current.resolve(req);

    if (!account) {
      res.redirect(AccountRoutes.signIn.template);
      return;
    }

    res.send(this.homePage(account));
  }

  @Get('register')
  @Header('Content-Type', 'text/html')
  registerForm(@Query('next') next?: string): string {
    return registerPage({ next });
  }

  @Post('register')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async register(
    @Body() body: RegisterInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const problem = registrationProblem(body);

    if (problem) {
      res.send(
        registerPage({
          error: problem,
          name: body.name,
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const key = this.linkKey(req);
    const waitMs = this.throttle.retryAfter(key);

    if (waitMs > 0) {
      res.send(
        registerPage({
          error: this.waitMessage(waitMs),
          name: body.name,
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    this.throttle.recordFailure(key);

    const email = normaliseEmail(body.email);
    const account = this.accounts.beginRegistration(body);

    const outcome = account
      ? await this.sendPasswordLink(req, account, TokenPurpose.Setup, body.next)
      : { failed: false };

    res.send(checkEmailPage({ email, ...outcome }));
  }

  @Get('sign-in')
  @Header('Content-Type', 'text/html')
  signInForm(@Query('next') next?: string): string {
    return signInPage({ next });
  }

  @Post('sign-in')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async signIn(
    @Body() body: { email?: string; password?: string; next?: string },
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const key = this.throttleKey(req);
    const waitMs = this.throttle.retryAfter(key);

    if (waitMs > 0) {
      res.send(
        signInPage({
          error: this.waitMessage(waitMs),
          email: normaliseEmail(body.email),
          next: body.next,
        }),
      );
      return;
    }

    const account = await this.accounts.authenticate(body);

    if (!account) {
      this.throttle.recordFailure(key);

      res.send(
        signInPage({
          error: 'That email and password did not match.',
          email: normaliseEmail(body.email),
          next: body.next,
        }),
      );
      return;
    }

    this.throttle.recordSuccess(key);
    this.session.start(req, res, account);
    res.redirect(this.safeNext(body.next));
  }

  @Get('set-password')
  @Header('Content-Type', 'text/html')
  setPasswordForm(
    @Query('token') token?: string,
    @Query('next') next?: string,
  ): string {
    const lookup = this.tokens.find(token);

    if (!lookup.ok) {
      return setPasswordPage({ valid: false, error: lookup.problem });
    }

    const account = this.accounts.findById(lookup.token.accountId);

    return setPasswordPage({
      valid: true,
      token,
      next,
      name: account?.name,
      purpose: lookup.token.purpose,
    });
  }

  @Post('set-password')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async setPassword(
    @Body() body: SetPasswordInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const lookup = this.tokens.find(body.token);

    if (!lookup.ok) {
      res.send(setPasswordPage({ valid: false, error: lookup.problem }));
      return;
    }

    const problem = setPasswordProblem(body);

    if (problem) {
      const account = this.accounts.findById(lookup.token.accountId);

      res.send(
        setPasswordPage({
          valid: true,
          error: problem,
          token: body.token,
          next: body.next,
          name: account?.name,
          purpose: lookup.token.purpose,
        }),
      );
      return;
    }

    const account = await this.accounts.setPassword(
      lookup.token.accountId,
      body.password ?? '',
    );

    if (!account) {
      res.send(
        setPasswordPage({
          valid: false,
          error: 'That link is not valid.',
        }),
      );
      return;
    }

    this.tokens.consume(lookup.token.id);
    this.throttle.recordSuccess(this.throttleKey(req));
    this.session.start(req, res, account);

    res.redirect(this.safeNext(body.next));
  }

  @Get('recover')
  @Header('Content-Type', 'text/html')
  recoverForm(@Query('next') next?: string): string {
    return recoverPage({ next });
  }

  @Post('recover')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async recover(
    @Body() body: ForgotInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const problem = forgotProblem(body);

    if (problem) {
      res.send(
        recoverPage({ error: problem, email: body.email, next: body.next }),
      );
      return;
    }

    const key = this.linkKey(req);
    const waitMs = this.throttle.retryAfter(key);

    if (waitMs > 0) {
      res.send(
        recoverPage({
          error: this.waitMessage(waitMs),
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    this.throttle.recordFailure(key);

    const email = normaliseEmail(body.email);
    const account = this.accounts.findByEmail(email);

    const outcome = account
      ? await this.sendPasswordLink(req, account, TokenPurpose.Reset, body.next)
      : { failed: false };

    res.send(checkEmailPage({ email, reset: true, ...outcome }));
  }

  @Post('password-link')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async selfServiceLink(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const account = this.current.resolve(req);

    if (!account) {
      res.redirect(AccountRoutes.signIn.template);
      return;
    }

    const key = this.linkKey(req);
    const waitMs = this.throttle.retryAfter(key);

    if (waitMs > 0) {
      res.send(this.homePage(account, { error: this.waitMessage(waitMs) }));
      return;
    }

    this.throttle.recordFailure(key);

    const purpose = account.secret ? TokenPurpose.Reset : TokenPurpose.Setup;
    const outcome = await this.sendPasswordLink(req, account, purpose);

    res.send(
      this.homePage(
        account,
        outcome.failed
          ? {
              error:
                'We could not send that email just now. Try again shortly.',
            }
          : { linkSent: true },
      ),
    );
  }

  @Post('recover-request')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  recoverRequest(
    @Body() body: RecoveryRequestInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): void {
    const problem = recoveryRequestProblem(body);

    if (problem) {
      res.send(
        recoverPage({
          requestError: problem,
          email: body.email,
          course: body.course,
          requestNote: body.note,
          next: body.next,
        }),
      );
      return;
    }

    const key = this.requestKey(req);

    if (this.throttle.retryAfter(key) > 0) {
      res.send(
        recoverPage({
          requestError:
            'You have sent a few of these already. Please wait a little before trying again.',
          email: body.email,
          course: body.course,
          requestNote: body.note,
          next: body.next,
        }),
      );
      return;
    }

    this.requests.submit(body);
    this.throttle.recordFailure(key);

    res.send(recoverPage({ requested: true }));
  }

  @Get('reset')
  @Header('Content-Type', 'text/html')
  resetForm(
    @Query('code') code?: string,
    @Query('next') next?: string,
  ): string {
    return resetPage({ code, next });
  }

  @Post('reset')
  @HttpCode(200)
  @Header('Content-Type', 'text/html')
  async reset(
    @Body() body: RecoveryInput & NextTarget,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const problem = resetProblem(body);

    if (problem) {
      res.send(
        resetPage({
          error: problem,
          email: body.email,
          code: body.code,
          next: body.next,
        }),
      );
      return;
    }

    const key = this.throttleKey(req);

    if (this.throttle.retryAfter(key) > 0) {
      res.send(
        resetPage({
          error: 'Too many attempts. Try again shortly.',
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const account = this.accounts.findByEmail(body.email);
    const spent = account
      ? await this.resets.consume(account.id, body.code)
      : false;

    if (!account || !spent) {
      this.throttle.recordFailure(key);

      res.send(
        resetPage({
          error:
            'That email and reset code did not match, or the code has expired.',
          email: body.email,
          next: body.next,
        }),
      );
      return;
    }

    const updated = await this.accounts.setPassword(
      account.id,
      body.password ?? '',
    );

    this.throttle.recordSuccess(key);
    if (updated) this.session.start(req, res, updated);

    res.redirect(this.safeNext(body.next));
  }

  @Post('sign-out')
  signOut(@Req() req: Request, @Res() res: Response): void {
    this.session.clear(req, res);

    res.redirect('/tutorials');
  }
}
