import { IntegrationAuthentication } from "core/authentication/types";

export const authentication: IntegrationAuthentication = {
  api_key: {
    type: "api_key",
    placement: {
      in: "header",
      type: "bearer",
      key: "Authorization",
    },
    documentation:
      "1. [Create an API key](https://app.sendgrid.com/settings/api_keys)\n2. Copy the API key\n3. Paste the API key into the field below",
    scopes: {
      "alerts.create": "alerts.create",
      "alerts.delete": "alerts.delete",
      "alerts.read": "alerts.read",
      "alerts.update": "alerts.update",
      "api_keys.create": "api_keys.create",
      "api_keys.delete": "api_keys.delete",
      "api_keys.read": "api_keys.read",
      "api_keys.update": "api_keys.update",
      "asm.groups.create": "asm.groups.create",
      "asm.groups.delete": "asm.groups.delete",
      "asm.groups.read": "asm.groups.read",
      "asm.groups.update": "asm.groups.update",
      "categories.create": "categories.create",
      "categories.delete": "categories.delete",
      "categories.read": "categories.read",
      "categories.update": "categories.update",
      "categories.stats.read": "categories.stats.read",
      "categories.stats.sums.read": "categories.stats.sums.read",
      "email_activity.read": "email_activity.read",
      "stats.read": "stats.read",
      "stats.global.read": "stats.global.read",
      "browsers.stats.read": "browsers.stats.read",
      "devices.stats.read": "devices.stats.read",
      "geo.stats.read": "geo.stats.read",
      "mailbox_providers.stats.read": "mailbox_providers.stats.read",
      "clients.desktop.stats.read": "clients.desktop.stats.read",
      "clients.phone.stats.read": "clients.phone.stats.read",
      "clients.stats.read": "clients.stats.read",
      "clients.tablet.stats.read": "clients.tablet.stats.read",
      "clients.webmail.stats.read": "clients.webmail.stats.read",
      "ips.assigned.read": "ips.assigned.read",
      "ips.read": "ips.read",
      "ips.pools.create": "ips.pools.create",
      "ips.pools.delete": "ips.pools.delete",
      "ips.pools.read": "ips.pools.read",
      "ips.pools.update": "ips.pools.update",
      "ips.pools.ips.create": "ips.pools.ips.create",
      "ips.pools.ips.delete": "ips.pools.ips.delete",
      "ips.pools.ips.read": "ips.pools.ips.read",
      "ips.pools.ips.update": "ips.pools.ips.update",
      "ips.warmup.create": "ips.warmup.create",
      "ips.warmup.delete": "ips.warmup.delete",
      "ips.warmup.read": "ips.warmup.read",
      "ips.warmup.update": "ips.warmup.update",
      "mail_settings.address_whitelist.read":
        "mail_settings.address_whitelist.read",
      "mail_settings.address_whitelist.update":
        "mail_settings.address_whitelist.update",
      "mail_settings.bounce_purge.read": "mail_settings.bounce_purge.read",
      "mail_settings.bounce_purge.update": "mail_settings.bounce_purge.update",
      "mail_settings.footer.read": "mail_settings.footer.read",
      "mail_settings.footer.update": "mail_settings.footer.update",
      "mail_settings.forward_bounce.read": "mail_settings.forward_bounce.read",
      "mail_settings.forward_bounce.update":
        "mail_settings.forward_bounce.update",
      "mail_settings.forward_spam.read": "mail_settings.forward_spam.read",
      "mail_settings.forward_spam.update": "mail_settings.forward_spam.update",
      "mail_settings.template.read": "mail_settings.template.read",
      "mail_settings.template.update": "mail_settings.template.update",
      "mail.batch.create": "mail.batch.create",
      "mail.batch.delete": "mail.batch.delete",
      "mail.batch.read": "mail.batch.read",
      "mail.batch.update": "mail.batch.update",
      "mail.send": "mail.send",
      "marketing_campaigns.create": "marketing_campaigns.create",
      "marketing_campaigns.delete": "marketing_campaigns.delete",
      "marketing_campaigns.read": "marketing_campaigns.read",
      "marketing_campaigns.update": "marketing_campaigns.update",
      "partner_settings.new_relic.read": "partner_settings.new_relic.read",
      "partner_settings.new_relic.update": "partner_settings.new_relic.update",
      "partner_settings.read": "partner_settings.read",
      "user.scheduled_sends.create": "user.scheduled_sends.create",
      "user.scheduled_sends.delete": "user.scheduled_sends.delete",
      "user.scheduled_sends.read": "user.scheduled_sends.read",
      "user.scheduled_sends.update": "user.scheduled_sends.update",
      "subusers.create": "subusers.create",
      "subusers.delete": "subusers.delete",
      "subusers.read": "subusers.read",
      "subusers.update": "subusers.update",
      "subusers.credits.create": "subusers.credits.create",
      "subusers.credits.delete": "subusers.credits.delete",
      "subusers.credits.read": "subusers.credits.read",
      "subusers.credits.update": "subusers.credits.update",
      "subusers.credits.remaining.create": "subusers.credits.remaining.create",
      "subusers.credits.remaining.delete": "subusers.credits.remaining.delete",
      "subusers.credits.remaining.read": "subusers.credits.remaining.read",
      "subusers.credits.remaining.update": "subusers.credits.remaining.update",
      "subusers.monitor.create": "subusers.monitor.create",
      "subusers.monitor.delete": "subusers.monitor.delete",
      "subusers.monitor.read": "subusers.monitor.read",
      "subusers.monitor.update": "subusers.monitor.update",
      "subusers.reputations.read": "subusers.reputations.read",
      "subusers.stats.read": "subusers.stats.read",
      "subusers.stats.monthly.read": "subusers.stats.monthly.read",
      "subusers.stats.sums.read": "subusers.stats.sums.read",
      "subusers.summary.read": "subusers.summary.read",
      "suppression.create": "suppression.create",
      "suppression.delete": "suppression.delete",
      "suppression.read": "suppression.read",
      "suppression.update": "suppression.update",
      "suppression.bounces.create": "suppression.bounces.create",
      "suppression.bounces.read": "suppression.bounces.read",
      "suppression.bounces.update": "suppression.bounces.update",
      "suppression.bounces.delete": "suppression.bounces.delete",
      "suppression.blocks.create": "suppression.blocks.create",
      "suppression.blocks.read": "suppression.blocks.read",
      "suppression.blocks.update": "suppression.blocks.update",
      "suppression.blocks.delete": "suppression.blocks.delete",
      "suppression.invalid_emails.create": "suppression.invalid_emails.create",
      "suppression.invalid_emails.read": "suppression.invalid_emails.read",
      "suppression.invalid_emails.update": "suppression.invalid_emails.update",
      "suppression.invalid_emails.delete": "suppression.invalid_emails.delete",
      "suppression.spam_reports.create": "suppression.spam_reports.create",
      "suppression.spam_reports.read": "suppression.spam_reports.read",
      "suppression.spam_reports.update": "suppression.spam_reports.update",
      "suppression.spam_reports.delete": "suppression.spam_reports.delete",
      "suppression.unsubscribes.create": "suppression.unsubscribes.create",
      "suppression.unsubscribes.read": "suppression.unsubscribes.read",
      "suppression.unsubscribes.update": "suppression.unsubscribes.update",
      "suppression.unsubscribes.delete": "suppression.unsubscribes.delete",
      "teammates.create": "teammates.create",
      "teammates.read": "teammates.read",
      "teammates.update": "teammates.update",
      "teammates.delete": "teammates.delete",
      "templates.create": "templates.create",
      "templates.delete": "templates.delete",
      "templates.read": "templates.read",
      "templates.update": "templates.update",
      "templates.versions.activate.create":
        "templates.versions.activate.create",
      "templates.versions.activate.delete":
        "templates.versions.activate.delete",
      "templates.versions.activate.read": "templates.versions.activate.read",
      "templates.versions.activate.update":
        "templates.versions.activate.update",
      "templates.versions.create": "templates.versions.create",
      "templates.versions.delete": "templates.versions.delete",
      "templates.versions.read": "templates.versions.read",
      "templates.versions.update": "templates.versions.update",
      "tracking_settings.click.read": "tracking_settings.click.read",
      "tracking_settings.click.update": "tracking_settings.click.update",
      "tracking_settings.google_analytics.read":
        "tracking_settings.google_analytics.read",
      "tracking_settings.google_analytics.update":
        "tracking_settings.google_analytics.update",
      "tracking_settings.open.read": "tracking_settings.open.read",
      "tracking_settings.open.update": "tracking_settings.open.update",
      "tracking_settings.read": "tracking_settings.read",
      "tracking_settings.subscription.read":
        "tracking_settings.subscription.read",
      "tracking_settings.subscription.update":
        "tracking_settings.subscription.update",
      "user.account.read": "user.account.read",
      "user.credits.read": "user.credits.read",
      "user.email.create": "user.email.create",
      "user.email.delete": "user.email.delete",
      "user.email.read": "user.email.read",
      "user.email.update": "user.email.update",
      "user.multifactor_authentication.create":
        "user.multifactor_authentication.create",
      "user.multifactor_authentication.delete":
        "user.multifactor_authentication.delete",
      "user.multifactor_authentication.read":
        "user.multifactor_authentication.read",
      "user.multifactor_authentication.update":
        "user.multifactor_authentication.update",
      "user.password.read": "user.password.read",
      "user.password.update": "user.password.update",
      "user.profile.read": "user.profile.read",
      "user.profile.update": "user.profile.update",
      "user.settings.enforced_tls.read": "user.settings.enforced_tls.read",
      "user.settings.enforced_tls.update": "user.settings.enforced_tls.update",
      "user.timezone.read": "user.timezone.read",
      "user.timezone.update": "user.timezone.update",
      "user.username.read": "user.username.read",
      "user.username.update": "user.username.update",
      "user.webhooks.event.settings.read": "user.webhooks.event.settings.read",
      "user.webhooks.event.settings.update":
        "user.webhooks.event.settings.update",
      "user.webhooks.event.test.create": "user.webhooks.event.test.create",
      "user.webhooks.event.test.read": "user.webhooks.event.test.read",
      "user.webhooks.event.test.update": "user.webhooks.event.test.update",
      "user.webhooks.parse.settings.create":
        "user.webhooks.parse.settings.create",
      "user.webhooks.parse.settings.delete":
        "user.webhooks.parse.settings.delete",
      "user.webhooks.parse.settings.read": "user.webhooks.parse.settings.read",
      "user.webhooks.parse.settings.update":
        "user.webhooks.parse.settings.update",
      "user.webhooks.parse.stats.read": "user.webhooks.parse.stats.read",
      "whitelabel.create": "whitelabel.create",
      "whitelabel.delete": "whitelabel.delete",
      "whitelabel.read": "whitelabel.read",
      "whitelabel.update": "whitelabel.update",
      "access_settings.activity.read": "access_settings.activity.read",
      "access_settings.whitelist.create": "access_settings.whitelist.create",
      "access_settings.whitelist.delete": "access_settings.whitelist.delete",
      "access_settings.whitelist.read": "access_settings.whitelist.read",
      "access_settings.whitelist.update": "access_settings.whitelist.update",
    },
  },
};
