import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/LegalDoc";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — InstaQuote" },
      {
        name: "description",
        content:
          "The terms you agree to when you use InstaQuote to create, price, save and send contractor quotes.",
      },
      { property: "og:title", content: "Terms of Service — InstaQuote" },
      {
        property: "og:description",
        content:
          "The terms you agree to when you use InstaQuote to create, price, save and send contractor quotes.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 17, 2026"
      relatedTo="/privacy"
      relatedLabel="Privacy Policy"
      intro={
        <>
          These terms are the agreement between you and InstaQuote. They cover using the app to write,
          price, save and send quotes. By creating an account or using the app, you accept them. Please
          read the parts about what the app does not do — quotes, taxes and pricing stay your
          responsibility.
        </>
      }
    >
      <LegalSection id="service" heading="What InstaQuote is">
        <p>
          InstaQuote is a quoting tool. You dictate or type job notes, and the app turns them into a
          priced line-item quote you can preview as a PDF, email, or copy into a text message. Quotes you
          save live on your account so you can pick them up on another device.
        </p>
        <p>
          InstaQuote is not a bank, an insurer, a payment processor, a marketplace, or a legal adviser. It
          does not take payment, run a credit check, guarantee that a client accepts a quote, or broker
          the contract between you and your client.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" heading="Who may use it">
        <ul>
          <li>You must be old enough to enter a binding agreement where you live.</li>
          <li>
            You must use it for your own business or for an employer that has authorised you to. If you
            quote on behalf of a company, you confirm you are allowed to bind that company to the quotes
            you send.
          </li>
          <li>You are responsible for anything done through your account, so keep your password private.</li>
        </ul>
      </LegalSection>

      <LegalSection id="account" heading="Your account">
        <p>
          Give us a real email address — it is how we reach you and how you recover access. Keep your
          business profile and saved clients accurate and current. If someone else gets into your account,
          tell us and change your password right away. You may close your account at any time; anything you
          saved with it will be deleted.
        </p>
      </LegalSection>

      <LegalSection id="your-content" heading="Your quotes and clients stay yours">
        <p>
          You own the quotes, notes, client details and business information you put into InstaQuote. We
          claim no ownership of it. You give us permission to store, display and process it only so the app
          can work: to build your PDF, send the email you asked for, and show it back to you.
        </p>
        <p>
          You are responsible for having the right to hold and use the client information you save, and for
          telling your clients how you use their details. Do not upload information about people you have no
          legitimate business reason to contact.
        </p>
      </LegalSection>

      <LegalSection id="accuracy" heading="You are responsible for what a quote says">
        <ul>
          <li>
            Line items, quantities, rates, totals, tax and payment terms are shown for your convenience.
            Check them before you send. AI-generated suggestions are a starting point, not a quotation you
            have approved until you have reviewed them.
          </li>
          <li>
            You choose your tax rate and payment terms. InstaQuote applies the numbers you configure; it
            does not determine what you are required to charge, collect or remit.
          </li>
          <li>
            A quote you send is an offer from you to your client. Whether it becomes a binding agreement,
            and on what terms, is between you and your client — not something InstaQuote decides or
            guarantees.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="not-advice" heading="Not professional advice">
        <p>
          Nothing in the app is tax, accounting, legal, safety-code or building-code advice. Rates, deposit
          structures and tax settings are yours to set and verify with your own accountant, insurer or
          lawyer. Getting a number wrong in a quote is a business risk you carry, not a claim against us.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" heading="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the app for anything unlawful, fraudulent or deceptive, including misleading quotes.</li>
          <li>
            Try to reach another user's data, break into the service, scan it for weaknesses, or route
            around limits or access controls.
          </li>
          <li>
            Copy, resell, reverse-engineer, or run automated scraping of the app or its output, or use it
            to build a competing quoting product.
          </li>
          <li>
            Upload malware, send bulk unsolicited quote emails, or use the email feature in a way that gets
            the sending domain blocked.
          </li>
          <li>Impersonate another business or misrepresent who a quote came from.</li>
        </ul>
        <p>
          If you break these rules we can warn you, limit the feature, suspend the account, or close it.
        </p>
      </LegalSection>

      <LegalSection id="third-party" heading="Third-party services inside the app">
        <p>
          Parts of InstaQuote depend on services we do not control: Google sign-in, the AI provider that
          reads your notes, the email delivery service behind the Email PDF button, the exchange-rate lookups
          behind currency conversion, and your browser's own speech recognition and printing. Those services
          have their own terms and availability. If one of them is down, rate-limited or changes its API, the
          related feature may be unavailable or inaccurate, and we are not responsible for that outage. Where
          a feature can fail safely, it does: for example, if a live rate cannot be fetched, your amounts are
          left as they were rather than guessed.
        </p>
      </LegalSection>

      <LegalSection id="availability" heading="Availability, changes and the free period">
        <p>
          We aim to keep the app running, but it is provided "as is" and "as available". Features may be
          added, changed or removed; the AI model behind generation may be replaced; and the app may be
          unavailable for maintenance, incidents, or reasons outside our control. Subscription pricing
          and the free trial are described in the "Subscriptions and free trials" section below.
        </p>
      </LegalSection>

      <LegalSection id="subscriptions" heading="Subscriptions and free trials">
        <p>
          InstaQuote offers a 7-day free trial when you first subscribe. The trial starts when you confirm
          it, and if you do not cancel before it ends, it converts automatically into the plan you picked
          — monthly ($9.99/month) or annual ($89.99/year) — and you are charged for the first period.
        </p>
        <p>
          If you subscribe on an iPhone or iPad, your subscription is billed through your Apple ID using
          Apple's in-app purchase system. Your Apple ID is charged when you confirm the purchase, and the
          plan renews automatically each month or each year unless you cancel at least 24 hours before the
          current period ends. Your Apple ID is charged for the renewal within 24 hours before that date,
          at the price you agreed to when you subscribed.
        </p>
        <p>
          You can cancel at any time in App Store Account Settings on your device (Settings → your name →
          Subscriptions, then choose InstaQuote). Cancelling stops future renewals; you keep access to the
          subscription until the end of the period you already paid for. Deleting the app or closing your
          account does not by itself cancel a subscription managed by Apple.
        </p>
        <p>
          Prices are set in your local currency by Apple, with applicable taxes added where required.
          Refunds for a purchase made through Apple are handled under Apple's media services terms.
        </p>
      </LegalSection>

      <LegalSection id="warranty" heading="No warranties beyond what the law gives you">
        <p>
          To the maximum extent the law allows, InstaQuote is provided without warranties of any kind —
          including that it will be error-free, uninterrupted, or that generated line items, rates, totals or
          exchange-rate conversions will be accurate. You are the professional; the app is the clipboard.
        </p>
      </LegalSection>

      <LegalSection id="liability" heading="Limits on our responsibility">
        <p>
          Where the law permits, InstaQuote is not liable for indirect or consequential losses — including
          lost jobs, lost revenue, mispriced quotes, lost or unrecoverable data, or the cost of buying a
          replacement service — arising from your use of, or inability to use, the app. If we are found
          liable for something despite that, our total responsibility to you is limited to the greater of
          what you paid us in the twelve months before the claim and CAD $100. These limits do not apply
          where the law says they cannot, including for our fraud or wilful misconduct.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" heading="If a claim comes from your use">
        <p>
          If a third party brings a claim against us because of quotes you sent, information you uploaded, or
          your breach of these terms, you agree to cover our reasonable costs in defending it.
        </p>
      </LegalSection>

      <LegalSection id="termination" heading="Ending the agreement">
        <p>
          You can stop using InstaQuote and close your account at any time. We may suspend or close an
          account that violates these terms, puts the service or other users at risk, or where we are
          required to by law. On closure, your saved quotes, clients and profile are deleted; you should
          export anything you want to keep first.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="Changes to these terms">
        <p>
          We may update these terms. For material changes we will update the "Last updated" date and tell you
          in the app or by email. If you keep using InstaQuote after a change takes effect, the new terms
          apply; if you do not accept them, close your account instead.
        </p>
      </LegalSection>

      <LegalSection id="law" heading="Governing law">
        <p>
          These terms are governed by the laws of the Province of Ontario and the laws of Canada applicable
          there, and disputes will be heard in the courts of Ontario. Nothing here removes the mandatory
          consumer protections of the place where you live.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="Contact">
        <p>
          Questions about these terms, or to report misuse:{" "}
          <a href="mailto:instaquotesupport@hkosolutions.ca">instaquotesupport@hkosolutions.ca</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
