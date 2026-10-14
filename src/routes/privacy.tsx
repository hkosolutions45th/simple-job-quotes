import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/LegalDoc";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — InstaQuote" },
      {
        name: "description",
        content:
          "How InstaQuote collects, uses and protects your business details, quotes, saved clients and voice notes.",
      },
      { property: "og:title", content: "Privacy Policy — InstaQuote" },
      {
        property: "og:description",
        content:
          "How InstaQuote collects, uses and protects your business details, quotes, saved clients and voice notes.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 14, 2026"
      relatedTo="/terms"
      relatedLabel="Terms of Service"
      intro={
        <>
          InstaQuote ("we", "us") is a quoting tool for contractors and trade workers. This policy
          explains exactly what we collect when you use it, why we need it, who else sees it, and how
          to get it removed. It is written in plain language on purpose — if anything here is unclear,
          ask us and we will answer in writing.
        </>
      }
    >
      <LegalSection id="summary" heading="The short version">
        <ul>
          <li>
            We collect what you type into the app: your business details, the quotes you make, and the
            clients you save.
          </li>
          <li>
            Your quotes are visible only to your own account. No other InstaQuote user can see them.
          </li>
          <li>
            Your voice notes are sent to our AI service to turn them into line items. We do not keep
            recordings of your voice.
          </li>
          <li>
            We do not sell your data, and we do not run third-party advertising trackers in the app.
          </li>
          <li>
            Deleting a quote, a saved client, or your account removes that data from your account.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="collected" heading="What we collect">
        <p>
          <strong>Account information.</strong> Your email address, and if you sign in with Google,
          the name and email Google shares with us. We also store a sign-in identifier and the date
          your account was created.
        </p>
        <p>
          <strong>Business profile.</strong> Whatever you enter in Business Settings: business name,
          phone, business email, street address, city, postal / ZIP code, default tax rate, default
          payment terms, logo, and preferred currency. This is used to pre-fill your quotes and to
          appear in the header of the PDF and emailed quote.
        </p>
        <p>
          <strong>Quotes.</strong> The line items, quantities and rates you keep, the totals and
          status (Draft, Sent, Accepted), the quote number, and the client details attached to that
          quote: name, email, phone, street address, city and postal / ZIP code.
        </p>
        <p>
          <strong>Saved clients.</strong> The client directory entries you choose to keep, containing
          the same contact and address fields. Saving a client is your decision — the app does not add
          a client automatically.
        </p>
        <p>
          <strong>Voice notes.</strong> The text of notes you dictate or type, when you press Generate
          Line-Item Quote. The audio itself is handled by your browser's speech recognition and is not
          uploaded to us or stored on our servers.
        </p>
        <p>
          <strong>On-device data.</strong> Your browser or device keeps a local copy of your current
          draft, the next quote number, your currency and exchange-rate cache, and a cached copy of
          your business profile and clients, so the app works offline and survives an app restart. This
          cache is scoped to your signed-in account.
        </p>
        <p>
          <strong>Technical logs.</strong> When something breaks, we receive an error report with the
          failing page, a stack trace, browser and device type, and timing information. This is used to
          fix bugs, not to profile you.
        </p>
      </LegalSection>

      <LegalSection id="use" heading="How we use it">
        <ul>
          <li>To show your quotes, totals and clients to you, on the device you sign in with.</li>
          <li>To turn your notes into priced line items using an AI service.</li>
          <li>To build the printable quote PDF and the email that carries it to your client.</li>
          <li>
            To keep the app working: keeping you signed in, applying your default tax rate and payment
            terms, and converting amounts into the currency you selected.
          </li>
          <li>To respond to support requests and to investigate abuse or security incidents.</li>
        </ul>
      </LegalSection>

      <LegalSection id="microphone" heading="Microphone and voice">
        <p>
          The microphone only turns on after you tap the record button, and the app asks your browser
          for permission first. You can stop recording by tapping the same button. If permission is
          denied, the app tells you how to re-enable it and keeps the text box available so you can
          still type your notes.
        </p>
        <p>
          Your browser converts speech to text. Depending on your browser and device, that transcription
          may be processed by the browser vendor under their own privacy notice. What reaches InstaQuote
          is the resulting text.
        </p>
      </LegalSection>

      <LegalSection id="ai" heading="AI processing of your notes">
        <p>
          When you press Generate Line-Item Quote, the text of your notes is sent to a large language
          model hosted by an AI provider that processes it on our behalf. The model returns a proposed
          list of line items, quantities and rates, plus any client name, contact details, address, city
          or postal code it finds in your notes, which the app then fills in for you.
        </p>
        <p>
          The provider is contractually restricted to processing that text for us and does not use it to
          train public models. Still, treat the notes field as you would a text message: do not paste in
          anything you would not want processed, such as payment card numbers, health information, or
          government identifiers.
        </p>
      </LegalSection>

      <LegalSection id="email" heading="Email, texts and sharing">
        <p>
          <strong>Email PDF.</strong> When you use this button, we send the quote from your verified
          sending domain to the address you enter, with the quote PDF attached and a short styled message
          built from the quote. We record that the message was sent (address, time, delivery result) so
          we can tell you whether it failed.
        </p>
        <p>
          <strong>Text and copy.</strong> The Text / Share options never route a message through us. "Send
          Text (SMS)" opens your own messaging app with the summary already typed in; the copy buttons put
          the summary on your clipboard. Whatever you then send is between you and your client, and is not
          stored by us.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" heading="Who else is involved">
        <ul>
          <li>
            <strong>Google</strong> — sign-in, if you choose "Continue with Google". Their privacy terms
            apply to that step.
          </li>
          <li>
            <strong>Hosting and database provider</strong> — stores your account data with row-level
            access control so your rows are readable only by your own signed-in session.
          </li>
          <li>
            <strong>AI provider</strong> — converts your notes into line items, as described above.
          </li>
          <li>
            <strong>Email delivery provider</strong> — delivers quote emails you send and handles the PDF
            attachment.
          </li>
          <li>
            <strong>Currency rate service</strong> — when you change currency, the app requests live
            exchange rates. That service sees your IP address and the request; no client or quote details
            are included.
          </li>
        </ul>
        <p>
          We do not sell your personal information, and we do not share it with advertisers. We may
          disclose data where we are legally required to, or to protect a user or the service from harm.
        </p>
      </LegalSection>

      <LegalSection id="retention" heading="How long we keep it, and deleting it">
        <p>
          Account, profile, quote and client data is kept while your account is open. Delete a quote or a
          saved client from inside the app and it is removed from your account and from your device cache.
          Closing your account removes your profile, quotes and saved clients.
        </p>
        <p>
          Error logs are kept briefly and then aged out. If you ask us to delete something that lives in a
          backup, we will remove it from the next backup cycle.
        </p>
      </LegalSection>

      <LegalSection id="security" heading="How we protect it">
        <ul>
          <li>All traffic between your device and our servers is encrypted in transit.</li>
          <li>
            Every table of your data is isolated per account at the database level, so another signed-in
            user's queries cannot return your rows.
          </li>
          <li>
            Sign-in sessions expire, and signing out clears your session and the data cached on that
            device.
          </li>
        </ul>
        <p>
          No system is perfectly secure. If you believe your account has been accessed by someone else,
          sign out everywhere, change your password, and tell us.
        </p>
      </LegalSection>

      <LegalSection id="rights" heading="Your choices and rights">
        <p>
          Depending on where you live, you may have the right to access your data, correct it, export it,
          restrict some processing, or ask for deletion. You can do most of it yourself in the app: Business
          Settings for your profile, the saved-quotes drawer for quotes, and the client directory for saved
          clients. For anything else — including a copy of everything we hold about you, or closing your
          account — contact us and we will handle the request.
        </p>
        <p>
          If you use InstaQuote on behalf of a company, that company is responsible for telling its own
          customers how their details are used. You are the one deciding what to save about a client, so
          keep only what the job needs.
        </p>
      </LegalSection>

      <LegalSection id="children" heading="Children">
        <p>
          InstaQuote is a business tool for working tradespeople and is not directed at children. We do
          not knowingly collect information from anyone under the age of majority.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="Changes to this policy">
        <p>
          If we change this policy in a way that affects what we do with your data, we will update the
          "Last updated" date above and, where the change matters, tell you in the app or by email before
          it takes effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="Contact">
        <p>
          Questions, corrections, or a deletion request: email{" "}
          <a href="mailto:instaquotesupport@hkosolutions.ca">instaquotesupport@hkosolutions.ca</a>. Include the email address on
          your account so we can find the right record.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
