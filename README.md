# InstaQuote Pro

Build a mobile-first web app called "InstaQuote" for contractors and trade workers (painters, landscapers, roofers, HVAC).

Key UI & Page Structure:

1. Dashboard Header: Display business name, logo upload, and a "+ New Quote" button.

2. Voice & Text Input Section:

   - A large, prominent microphone button ("Hold to Dictate Notes") using web speech browser API.

   - A text area fallback where contractors can manually type or edit dictation notes.

   - A primary action button: "Generate Line-Item Quote".

3. Dynamic Line-Item Table:

   - Columns: Item Description, Quantity, Unit Rate ($), Total ($).

   - Show an auto-calculated Subtotal, Tax Rate toggle (default 13%), and Final Total.

   - Editable rows with "Add Row" and "Delete Row" icons.

4. Customer & Job Details Form:

   - Client Name, Client Email, Client Phone, Job Address, and Payment Terms (e.g., "50% Deposit Required").

5. Quote Preview & Action Bar:

   - A "Preview PDF" button that renders a clean, professional, print-ready PDF invoice/quote template.

   - "Send via Text/Email" modal with pre-formatted message text.

Styling: Modern, clean Tailwind CSS, highly accessible with dark text on light background, large touch targets for mobile use in sunlight, using shadcn/ui components.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://simple-job-quotes.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d1b79c57-f6bd-4aee-a4d1-c262910786db).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
