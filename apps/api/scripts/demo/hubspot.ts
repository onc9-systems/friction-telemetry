// The HubSpot demo's content: one initiative, its theses, and the two documents the answers cite.
// Each guide section is one task and stays under the chunker's 1,200 characters, so it is one passage.
// Two gaps are deliberate, so a live question can come back Unanswerable and route to Andrés: importing the
// old spreadsheet, and merging duplicate records.

export const INITIATIVE = {
  id: "6b1d0e2a-4c7f-4a8e-9b31-5d2f0c8e7a14",
  name: "HubSpot CRM rollout",
  whatIsChanging:
    "The sales team moves every customer record from the shared spreadsheet and personal Outlook contacts into HubSpot.",
  why: "Customer history lives in individual inboxes and one spreadsheet, so nobody sees the whole relationship with a customer.",
  targetDate: "2026-10-01",
};

export const THESES = [
  { id: "0c6f1f4e-8d2a-4b57-a1e3-7f9c2b6d4e01", statement: "Reps can add a company and its contacts in HubSpot without asking anyone." },
  { id: "0c6f1f4e-8d2a-4b57-a1e3-7f9c2b6d4e02", statement: "Every customer email is logged in HubSpot the day it is sent." },
  { id: "0c6f1f4e-8d2a-4b57-a1e3-7f9c2b6d4e03", statement: "Nobody keeps customer records outside HubSpot after 1 October." },
];

export type DemoDocument = { documentId: string; versionId: string; fileName: string } & (
  | { kind: "html"; html: string }
  | { kind: "pptx"; slides: Array<{ title: string; lines: string[] }> }
);

const GUIDE_HTML = `<html><body>
<h1>HubSpot Rollout Guide</h1>
<p>Acme Logistics, Sales. Version 1, 21 September 2026. Owner: Andrés Campos, Project Manager.</p>

<h2>1 What is changing</h2>
<p>From 1 October 2026, the sales team keeps every customer record in HubSpot. The shared customer spreadsheet and personal Outlook contacts stop being the record. Pipeline reviews use HubSpot only.</p>

<h2>2 Companies and contacts are separate records</h2>
<p>In HubSpot, a company is a business and a contact is one person. They are two separate records. To show that a person works at a company, you associate the contact with the company.</p>
<p>Typing the company's name into a contact's Company name property does not associate them. That property is plain text. A contact appears on a company's record only after you associate the two.</p>
<p>When a contact's email address uses the company's domain, for example sara@gulfcargo.ae, HubSpot associates the contact with that company automatically. A contact with a Gmail or Outlook.com address is not associated automatically. Associate them yourself, as section 4 shows.</p>

<h2>3 Add a company</h2>
<ol>
<li>In HubSpot, go to CRM, then Companies.</li>
<li>Search for the company first. HubSpot uses the company domain name to find duplicates, and it tells you when a company already exists.</li>
<li>If it is not there, click Add company, then Create new.</li>
<li>Enter the company domain name, for example gulfcargo.ae. HubSpot fills in the name and other details from the domain.</li>
<li>Click Create.</li>
</ol>

<h2>4 Add a contact to a company</h2>
<p>Start from the company's record. This creates the contact and associates it in one step.</p>
<ol>
<li>Go to CRM, then Companies, and click the company's name to open it.</li>
<li>In the right sidebar, find the Contacts card.</li>
<li>Click + Add. A panel opens on the right.</li>
<li>For a new person, click the Create new tab. Enter their email address, first name and last name, then click Create.</li>
<li>For a person already in HubSpot, search for them in the same panel and select the checkbox next to their name. Click Next, then click Save.</li>
</ol>
<p>The contact now shows on the company's Contacts card, and the company shows on the contact's record.</p>

<h2>5 Create a contact first, then associate the company</h2>
<p>Go to CRM, then Contacts. Click Add contact, then Create new. Enter the email address, first name and last name. In the Associate contact with section, choose the company, then click Create.</p>
<p>If you created the contact without a company, open the contact. In the right sidebar, find the Companies card, click + Add, and choose the company.</p>

<h2>6 A contact who works with more than one company</h2>
<p>A contact can be associated with several companies. One of them is the primary company. The first company you associate becomes the primary company. HubSpot logs the contact's emails and calls on the primary company only.</p>
<p>To change it, open the contact and find the Companies card. Hover over the company, click the three dots, and choose Set as primary.</p>

<h2>7 Log customer emails</h2>
<p>IT installs the HubSpot Sales add-in for Outlook on every sales laptop. In classic Outlook, open it with Sales Tools in the ribbon. In the new Outlook, open it with Apps, then HubSpot Sales.</p>
<p>When you write to a customer, select the Log checkbox under Message tools. Keep the HubSpot Sales panel open when you click Send. HubSpot then saves the email on the contact's record. Track email opens is a separate checkbox: it tells you when the customer opens the email.</p>
<p>Log every email you send to a customer on the day you send it.</p>

<h2>8 What to stop doing</h2>
<ul>
<li>Do not add customers to the shared spreadsheet. It becomes read-only on 1 October 2026.</li>
<li>Do not keep customer details only in your Outlook contacts.</li>
<li>Do not email a colleague to ask who owns a customer. The contact owner is on the contact's record.</li>
</ul>

<h2>9 Where to get help</h2>
<p>Ask in Friction first. It answers from this guide. Anything this guide does not cover goes to Andrés Campos, who owns the rollout.</p>
</body></html>`;

export const DOCUMENTS: DemoDocument[] = [
  {
    documentId: "a3e5c7d9-1b2f-4e6a-8c0d-2f4b6d8e0a11",
    versionId: "a3e5c7d9-1b2f-4e6a-8c0d-2f4b6d8e0b11",
    fileName: "HubSpot Rollout Guide.html",
    kind: "html",
    html: GUIDE_HTML,
  },
  {
    documentId: "a3e5c7d9-1b2f-4e6a-8c0d-2f4b6d8e0a12",
    versionId: "a3e5c7d9-1b2f-4e6a-8c0d-2f4b6d8e0b12",
    fileName: "HubSpot Rollout FAQ.pptx",
    kind: "pptx",
    slides: [
      { title: "HubSpot rollout FAQ", lines: ["The questions the sales team asked most in the first week."] },
      {
        title: "I typed the company name on the contact. Why is the contact not on the company?",
        lines: [
          "The Company name property on a contact is plain text. It does not associate the contact with the company.",
          "Open the company, find the Contacts card in the right sidebar, click + Add, and choose the contact.",
        ],
      },
      {
        title: "Do I have to enter an email address for a contact?",
        lines: [
          "HubSpot accepts a contact without one. But HubSpot uses the email address to find duplicate contacts and to log your emails.",
          "Always enter the email address when you have it.",
        ],
      },
      {
        title: "Who can see the companies and contacts I create?",
        lines: ["Everyone in Sales sees every company and contact. You are the contact owner of the records you create."],
      },
      {
        title: "When does the shared spreadsheet close?",
        lines: ["It becomes read-only on 1 October 2026. From that day, HubSpot is the only customer record."],
      },
    ],
  },
];
