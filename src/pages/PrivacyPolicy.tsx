import FortiHeader from "@/components/FortiHeader";
import FortiFooter from "@/components/FortiFooter";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <FortiHeader />
      
      <main className="pt-24 pb-16">
        <div className="forti-container">
          <div className="max-w-4xl mx-auto">
            <h1 className="forti-heading-lg mb-4">Forti Privacy Policy</h1>
            <p className="text-muted-foreground mb-12">Last Updated: 10/27/2026</p>
            
            <div className="prose prose-invert max-w-none space-y-8">

              <section id="sms">
                <h2 className="text-xl font-semibold mb-4 text-foreground">SMS Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ride Forti LLC may send text messages to users who opt in. Mobile numbers and SMS consent are not shared with third parties or affiliates for marketing purposes. Text STOP to opt out and HELP for help.
                </p>
              </section>

              {/* 1. Introduction */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">1. Introduction</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.1 Purpose of This Privacy Policy</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  This Privacy Policy explains how Forti Technologies, Inc. ("Forti," "we," "us," or "our") collects, uses, stores, discloses, and protects personal information and data about individuals who interact with our services, including users of the Forti mobile application, website, APIs, and related technology platforms (collectively, the "Platform"). This Privacy Policy also explains your rights regarding your personal data and how you may exercise those rights.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.2 Scope of This Privacy Policy</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">This Privacy Policy applies to all individuals who access or use the Platform, including:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Riders — individuals who request or use transportation and related services</li>
                  <li>Service Providers — Drivers, Guards, Escorts, fleet operators, or contractor personnel</li>
                  <li>Customers — prospective users, account holders, or visitors to the Platform</li>
                  <li>Third Parties — individuals whose information may be processed in connection with Platform operations</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.3 Controller and Company Identification</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For the purposes of data protection laws, Forti is the data controller responsible for the collection and processing of your personal data. If you have questions, you may contact us using the details provided in Section 17.
                </p>
                <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-4">
                  <p className="text-muted-foreground">Company: Forti Technologies, Inc.</p>
                  <p className="text-muted-foreground">Email: privacy@forti.com</p>
                  <p className="text-muted-foreground">Website: https://www.rideforti.com</p>
                </div>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.4 Acceptance of This Privacy Policy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using the Platform, creating an Account, or otherwise providing your personal data to Forti, you explicitly acknowledge that you have read, understood, and agree to the terms of this Privacy Policy. If you do not agree, you should discontinue use of the Platform.
                </p>
              </section>

              {/* 2. Data We Collect */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">2. Data We Collect</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.1 Personal Information</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong className="text-foreground">Identity Information:</strong> name, date of birth, username, profile photo, government-issued ID numbers, driver's license, professional credentials</li>
                  <li><strong className="text-foreground">Contact Information:</strong> email address, phone number, mailing address, emergency contact details</li>
                  <li><strong className="text-foreground">Account Credentials:</strong> login details, authentication tokens, hashed passwords, security questions</li>
                  <li><strong className="text-foreground">Profile Information:</strong> vehicle make/model, profile preferences, subscription tier status, ratings, feedback</li>
                  <li><strong className="text-foreground">Communications Data:</strong> content of messages, support tickets, chat conversations, customer service interactions</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.2 Usage, Analytics, and Logs</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Usage Data: pages viewed, features accessed, timestamps, session duration, navigation paths</li>
                  <li>System Logs: server logs, error logs, crash reports, diagnostic information</li>
                  <li>Analytics: performance metrics, aggregated statistical data, user engagement patterns</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.3 Location Data (Real-Time and Background)</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To provide core services such as matching, routing, live tracking, and safety features, we process your location data including real-time GPS location during ride requests and active rides.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.4 Payment Information</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Payment Method Data: credit or debit card details, tokenized payment credentials, billing address</li>
                  <li>Transaction Details: amounts charged, dates/times of transactions, receipts, invoices</li>
                  <li>Payment Provider Data: information provided to or collected by third-party payment processors such as Stripe, Apple Pay, or other supported instruments</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We do not store full payment card details on our servers; instead, tokenization and secure storage are handled by our authorized payment processors in accordance with applicable security standards (e.g., PCI DSS).
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.5 Device Identifiers & Cookies</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Device Identifiers: mobile device IDs, advertising identifiers, operating system version, hardware model</li>
                  <li>Cookies: small data files stored on your device for Platform functionality, preferences, session management</li>
                  <li>Tracking Technologies: pixels, web beacons, SDKs used to monitor performance and support analytics</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.6 Communications (Chat, Messages)</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We collect and store communications exchanged through the Platform, including in-app chat, support communications, and message metadata. We may monitor and process communications for quality assurance, dispute resolution, safety monitoring, fraud detection, and compliance.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.7 Aggregated or De-Identified Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may collect aggregated or de-identified information that cannot reasonably be used to identify you. We may use such data internally for analytics, research, and business decisions. We do not sell, share, or disclose aggregated or de-identified data to third parties for marketing or promotional purposes.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">2.8 Sensitive Personal Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sensitive categories of personal data (such as biometric data, government ID information, or financial account details) may be collected solely to fulfill required compliance or verification obligations, handled with heightened security measures.
                </p>
              </section>

              {/* 3. How We Collect Data */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">3. How We Collect Data</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.1 Directly From You</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We collect information you voluntarily provide when you create or update your Account, submit documentation, request rides or security services, communicate with other Users or support, provide payment information, participate in surveys, or upload content.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.2 Automatically Via Technology</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When you access the Platform, we automatically collect data using cookies, pixels, SDKs, and other tracking tools, including device and browser identifiers, usage data, system logs, location information, and interaction data.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.3 From Third Parties</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may receive data from third-party sources including verification partners (e.g., Persona), mapping & geolocation providers (e.g., Google Maps, Apple Maps), payment processors (e.g., Stripe, Apple Pay), analytics & hosting providers, and public/commercial sources.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.4 Aggregate and Inferred Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may create aggregate or derived data by combining information from multiple sources for business intelligence, performance metrics, and trend analysis.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.5 Consent and Legal Basis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By using the Platform, you consent to our collection and processing of your data as described. For data processed based on legal requirements or legitimate interests, we rely on permissible legal bases under applicable data protection laws.
                </p>
              </section>

              {/* 4. How We Use Your Data */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">4. How We Use Your Data</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.1 To Provide Rides & Security Services</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Processing ride requests, coordinating service assignments, communicating trip details, facilitating optional security services (Guards, Escorts, armored transport), and ensuring service delivery.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.2 Matching, Dispatch, and Live Tracking</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your information, including location data and preferences, is used to match you with available Service Providers and coordinate dispatch, mapping, routing, and real-time location updates.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.3 Payments & Billing</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Processing ride fares, subscription charges, cancellations, refunds, payout disbursements, receipts, invoices, and preventing payment fraud.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.4 Safety & Emergency (SOS)</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Processing data for SOS alerts and emergency support, including sharing your location and contact information with designated emergency contacts, Service Providers, or appropriate authorities.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.5 Customer Support</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Responding to questions, resolving issues, improving your experience, and facilitating dispute resolution by reviewing chat histories, ride details, billing records, and diagnostic logs.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.6 Analytics & Improvement</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Analyzing usage patterns, performance metrics, and interaction data to enhance features, optimize algorithms, detect fraud, and develop improvements.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.7 Notifications & Alerts</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Sending transactional and service-related notifications including ride confirmations, driver arrival alerts, account updates, payment receipts, subscription reminders, and safety advisories.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.8 Legal Compliance</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Complying with applicable laws, regulations, legal processes, court orders, government requests, or law enforcement investigations.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.9 Legal Basis for Processing</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Where required by applicable data protection laws (such as GDPR), our use of your personal data is based on performance of a contract, consent, compliance with legal obligation, protection of vital interests, or our legitimate interests.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.10 Aggregated or De-Identified Use</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may use aggregated, anonymized, or de-identified information for analytics, reporting, or research that does not identify you directly.
                </p>
              </section>

              {/* 5. Legal Basis for Processing */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">5. Legal Basis for Processing</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.1 Consent</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Where required by applicable law, Forti processes your personal data based on your explicit consent. You may withdraw your consent at any time by adjusting your settings or contacting support.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.2 Performance of a Contract</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti processes personal data as necessary to perform the contract between you and Forti, including enabling ride requests, matching, dispatch, live tracking, coordinating security options, processing payments, delivering customer support, and verifying identity.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.3 Legitimate Interests</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may process personal data when reasonably necessary to pursue legitimate business interests, including improving Platform functionality, enhancing safety and fraud detection, conducting analytics, developing new services, and preventing abusive use.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.4 Compliance With Law</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may process and disclose your personal data to comply with legal obligations, regulatory requirements, court orders, or law enforcement investigations.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.5 Vital Interests</h3>
                <p className="text-muted-foreground leading-relaxed">
                  In limited circumstances, Forti may process your personal data where necessary to protect your vital interests or those of another person, such as during a verified emergency (SOS event).
                </p>
              </section>

              {/* 6. Data Sharing & Disclosure */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">6. Data Sharing & Disclosure</h2>

                <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-6">
                  <p className="text-foreground font-medium mb-2">Important: No Sale or Sharing of Personal Data</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Forti does not sell, rent, lease, or share your personal information, opt-in data, or contact information with third parties or affiliates for their own marketing or promotional purposes. We only share end-user data with our subcontractors or outsourced service providers solely to fulfill the services we render to you.
                  </p>
                </div>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.1 Subcontractors and Service Providers</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti shares necessary personal data with subcontractors and outsourced service providers — including Drivers, Guards, and Escorts — solely to facilitate and fulfill the services we render to you, such as ride requests, security services, matching, dispatch, routing, live tracking, and communication. Sharing is strictly limited to information directly necessary for service delivery. These parties are contractually prohibited from using your data for any purpose other than fulfilling the services provided to you.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.2 Payment Processors</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti shares relevant billing and payment information with authorized third-party payment processors, including Stripe, Apple Pay, Google Pay, or other supported payment providers, solely to process transactions and fulfill the services rendered to you. These processors are contractually bound to use your data only for payment processing purposes.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.3 Mapping and Geolocation Services</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti integrates with mapping providers such as Google Maps and Apple Maps, sharing limited location data and routing queries solely as necessary for accurate mapping and navigation to fulfill the services rendered to you.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.4 Verification Partners</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may share relevant personal data with third-party verification partners (e.g., Persona) solely to verify identity, credentials, and background information as required to fulfill the services rendered to you.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.5 Analytics, Hosting & Performance Providers</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may share aggregated, de-identified, or pseudonymized data with analytics, cloud hosting, and performance monitoring providers solely to maintain, improve, and support the Platform's functionality. This data cannot be used to identify individual users and is never shared for marketing or promotional purposes.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.6 Legal Authorities</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may disclose your information to government agencies, law enforcement, or regulatory authorities only when required by law, subpoena, court order, or to prevent imminent harm, protect user safety, detect fraud, or enforce our Terms.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.7 Emergency and Safety Situations</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In emergency situations, including SOS activations, Forti may share your contact information, location data, and service details with emergency responders and designated contacts solely to protect your safety.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.8 Business Transactions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In the event of a merger, acquisition, or sale of assets, your data may be transferred to the successor entity. The successor entity will be bound by the same data protection obligations described in this Privacy Policy and will not use your data for marketing or promotional purposes beyond what is described herein.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.9 With Your Consent or Instruction</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may share personal data only when you expressly request or authorize such sharing for specific purposes.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.10 No Sharing for Third-Party Marketing</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti does not share, sell, or disclose your personal information, opt-in consent data, phone number, email address, or any contact information to third parties or affiliates for their own marketing, advertising, or promotional purposes. All data sharing is limited to subcontractors and service providers acting solely on Forti's behalf to fulfill the services rendered to you.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.11 Subcontractor Obligations</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All subcontractors and outsourced service providers who receive your data are contractually required to protect your information, use it only for the specific purpose of fulfilling services on behalf of Forti, and are prohibited from using your data for their own marketing or business purposes.
                </p>
              </section>

              {/* 7. Location Data Handling */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">7. Location Data Handling</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.1 Real-Time Tracking</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti collects and processes real-time location data from Users' devices for ride matching, routing, live arrival estimates, driver/guard tracking, and trip progress updates. This includes precise geographic coordinates, speed, direction, and movement history during active use.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.2 Background Location</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Certain features may require access to your location data when the app is running in the background, collected only with your explicit permission through your device settings.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.3 Consent and Toggling</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may manage or revoke location permissions at any time through your device's settings. Disabling location may limit or disable key Platform features including ride matching, live tracking, and emergency support. Forti does not continue to collect location data if you withdraw consent.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.4 Use in Emergency and SOS Features</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When you activate SOS features, Forti may collect and use your current location, trip history, and emergency contact information to facilitate an appropriate response, including sharing with emergency contacts, Service Providers, or relevant authorities.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.5 Purpose and Scope of Location Use</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Matching Riders with nearby Service Providers and optimizing dispatch</li>
                  <li>Calculating distance-based charges, routing, and trip ETA</li>
                  <li>Enabling live tracking visible to Riders during active engagements</li>
                  <li>Supporting route accuracy, safety monitoring, and incident investigation</li>
                  <li>Coordinating emergency and SOS response</li>
                  <li>Analyzing geographic usage and performance metrics</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.6–7.8 Additional Location Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Location data is retained and protected in accordance with our data retention and security policies. Forti may use third-party providers for location-based features. While Forti strives for accuracy, actual location data quality may vary due to device hardware, network conditions, or third-party service limitations.
                </p>
              </section>

              {/* 8. User Choices & Controls */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">8. User Choices & Controls</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.1 Access, Correction & Deletion</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may request access to your personal data, correct inaccuracies, or request deletion through your account settings, in-app support, or by contacting privacy@forti.com. Certain information may be retained after deletion for legal compliance, safety, dispute resolution, or fraud prevention.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.2 Location Permissions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may enable or disable real-time and background location access in your device settings at any time.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.3 Payment Method Updates</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may add, update, or remove stored payment methods through the Platform's payment settings. Full payment card information is tokenized and managed by third-party processors.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.4 Communication Preferences</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may manage preferences for promotional communications through your account settings or opt-out mechanisms. Transactional messages necessary for service delivery cannot be opted out of.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.5 Opt-Out Rights</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may opt out of certain processing activities such as marketing communications and analytics tracking through your account settings, device permissions, or by contacting privacy@forti.com.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.6 Do Not Track Signals</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti does not currently respond to "Do Not Track" signals because there is no common industry standard for handling them.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.7 Withdraw Consent</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Where processing is based on consent, you may withdraw consent at any time without affecting prior processing.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.8 Data Portability</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Where required by law, you may request a copy of your personal data in a structured, commonly used, machine-readable format.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.9 Exercising Your Rights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Forti will verify your identity before fulfilling requests. Forti may deny requests that are frivolous, excessive, repetitive, or pose a security risk.
                </p>
              </section>

              {/* 9. Retention of Data */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">9. Retention of Data</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">9.1 Retention Periods</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">Forti retains personal data for as long as necessary. Specific categories include:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong className="text-foreground">Account and Profile Information:</strong> Duration of active Account plus a reasonable period for compliance and audit purposes</li>
                  <li><strong className="text-foreground">Location Data:</strong> Duration of associated service, and thereafter for analytics, safety, and legal compliance</li>
                  <li><strong className="text-foreground">Payment and Billing Records:</strong> As required for financial recordkeeping, tax reporting, and regulatory obligations</li>
                  <li><strong className="text-foreground">Communications and Support Logs:</strong> Retained for dispute resolution, service improvement, and quality assurance</li>
                  <li><strong className="text-foreground">De-identified or Aggregated Data:</strong> Retained indefinitely for analysis and business intelligence</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">9.2 Criteria for Deletion or Archival</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti applies reasonable criteria for deletion including business necessity, dispute resolution needs, legal requirements, and whether anonymization can preserve analytic value. When data is no longer required, Forti will either securely delete it or transform it into anonymized format.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">9.3–9.6 Additional Retention Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Forti maintains backup and disaster recovery procedures. Data subject to legal holds will not be deleted until the hold is lifted. Deletion may occur automatically or manually. Forti may update retention practices to reflect changes in legal standards or business needs.
                </p>
              </section>

              {/* 10. Cookies & Tracking Technologies */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">10. Cookies & Tracking Technologies</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.1 Types of Tracking Technologies</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong className="text-foreground">Cookies:</strong> Small text files for preferences, login tokens, session state, and authentication</li>
                  <li><strong className="text-foreground">Web Beacons:</strong> Transparent images or scripts for usage and campaign performance analysis</li>
                  <li><strong className="text-foreground">Local/Session Storage:</strong> Browser-based storage for enhanced performance and interactive features</li>
                  <li><strong className="text-foreground">Mobile Identifiers and SDKs:</strong> Unique identifiers for analytics, crash reporting, and performance monitoring</li>
                  <li><strong className="text-foreground">Pixels and Tracking Scripts:</strong> Code for collecting usage metrics and engagement trends</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.2 Purposes</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Authentication & Session Management</li>
                  <li>Preferences & Personalization</li>
                  <li>Performance & Analytics</li>
                  <li>Security & Fraud Prevention</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.3 Cookie Categories</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong className="text-foreground">Essential Cookies:</strong> Necessary for core functionality — cannot be disabled</li>
                  <li><strong className="text-foreground">Functional Cookies:</strong> Enable enhanced features like preferences and personalization</li>
                  <li><strong className="text-foreground">Performance & Analytics Cookies:</strong> Collect aggregated usage data for improvement</li>
                  <li><strong className="text-foreground">Advertising / Targeting Cookies:</strong> Forti does not use advertising or targeting cookies to share your data with third parties for marketing purposes</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.4–10.7 Cookie Controls</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Most browsers provide settings to manage or block cookies. Blocking cookies may affect some Platform features. Forti does not currently respond to "Do Not Track" signals. Forti does not use cookies or tracking technologies to share your personal data with third parties for marketing or promotional purposes. Where required by law, Forti will obtain consent before placing non-essential cookies.
                </p>
              </section>

              {/* 11. Security of Your Information */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">11. Security of Your Information</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">11.1 Security Measures</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Encryption of sensitive data in transit and at rest using industry-standard protocols</li>
                  <li>Secure authentication: multi-factor authentication, tokenization, password hashing</li>
                  <li>Network security: firewalls, intrusion detection systems, access control mechanisms</li>
                  <li>Regular security audits, vulnerability scanning, penetration testing, and code reviews</li>
                  <li>Role-based access restrictions limiting access to authorized personnel only</li>
                  <li>Data segmentation and compartmentalization</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">11.2 Limitations of Security</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  No security system is completely secure or impenetrable. No method of transmission over the internet is 100% secure. You also play a role in protecting your data by safeguarding account credentials and keeping devices updated.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">11.3 Notification of Data Breaches</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  In the event of a confirmed data breach, Forti will contain and mitigate the breach, conduct an investigation, notify affected users without undue delay in compliance with applicable law, and provide information about the types of data impacted and recommended actions.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">11.4 Your Responsibilities</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree to use strong passwords, keep credentials confidential, secure your devices, and report any unauthorized access immediately.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">11.5 Continuous Improvement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Forti regularly reviews and updates its security practices in response to evolving technology, emerging threats, and regulatory requirements.
                </p>
              </section>

              {/* 12. Children's Privacy */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">12. Children's Privacy</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">12.1 Age Restrictions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform is intended for users who are at least 18 years of age or the age of majority in their jurisdiction.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">12.2 Data Collection Policies for Minors</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti does not knowingly collect personal information from children under 18 without verifiable parental consent. If discovered, Forti will take steps to delete such data promptly.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">12.3–12.5 Additional Minor Protections</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Parental consent is required where mandated by law. Minors are prohibited from creating service provider profiles or accessing payment features. Forti adheres to COPPA and similar global privacy regulations.
                </p>
              </section>

              {/* 13. Third-Party Websites & Links */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">13. Third-Party Websites & Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform may contain links to websites or services operated by third parties. This Privacy Policy does not apply to those third parties. You should review their privacy policies before providing any personal information. Forti is not responsible for any loss, damage, or claim arising from your use of third-party services. Inclusion of a link does not imply endorsement by Forti. Forti does not share your personal data with linked third-party websites for marketing or promotional purposes.
                </p>
              </section>

              {/* 14. International Transfers */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">14. International Transfers</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your personal data may be collected, processed, stored, or transmitted across national borders to Forti's facilities or cloud providers located in jurisdictions outside your country of residence, solely to fulfill the services rendered to you. Forti does not transfer your personal data to affiliates or third-party partners for their own marketing or promotional purposes.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">14.1 Legal Bases and Safeguards</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To the extent required by applicable data protection laws (GDPR, UK GDPR, or similar), Forti relies on adequacy decisions, Standard Contractual Clauses (SCCs), binding corporate rules, or other authorized mechanisms for lawful cross-border transfers.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">14.2–14.4 Additional Transfer Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  International data transfers inherently involve some degree of risk. You may have the right to request information about safeguards used. For inquiries regarding international transfers, contact privacy@forti.com.
                </p>
              </section>

              {/* 15. California & Global Privacy Rights */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">15. California & Global Privacy Rights</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">15.1 California Privacy Rights (CCPA/CPRA)</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">If you are a California resident, you may have rights including:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong className="text-foreground">Right to Know:</strong> Request disclosure of categories and specific pieces of personal information collected</li>
                  <li><strong className="text-foreground">Right to Access:</strong> Request a copy of personal data maintained</li>
                  <li><strong className="text-foreground">Right to Delete:</strong> Request deletion of certain personal information</li>
                  <li><strong className="text-foreground">Right to Opt Out:</strong> Opt out of sale or sharing of personal information. Note: Forti does not sell or share your personal information with third parties for marketing or promotional purposes.</li>
                  <li><strong className="text-foreground">Non-Discrimination:</strong> Forti will not discriminate against you for exercising your rights</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">15.2 GDPR Rights</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">If you are in the EEA, UK, or similar jurisdictions, additional rights include:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Right of Access</li>
                  <li>Right to Rectification</li>
                  <li>Right to Erasure ("Right to Be Forgotten")</li>
                  <li>Right to Restrict Processing</li>
                  <li>Right to Data Portability</li>
                  <li>Right to Object</li>
                  <li>Right to Withdraw Consent</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">15.3–15.6 Exercising Rights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To submit rights requests, use in-app mechanisms, contact privacy@forti.com, or submit through your account settings. Forti will respond within applicable legal timelines, typically within 30 days. Rights may be subject to limitations including legal compliance, safety investigations, and fraud prevention. In some jurisdictions, you may designate an authorized agent to submit requests on your behalf.
                </p>
              </section>

              {/* 16. Changes to This Privacy Policy */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">16. Changes to This Privacy Policy</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">16.1 How Changes Are Communicated</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may update this Privacy Policy from time to time. When updated, the revised policy will be published on the Platform with the updated "Effective Date." Additional notice may be provided via in-app notifications, email, or push notifications for material changes.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">16.2 Continued Use Constitutes Acceptance</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By continuing to access or use the Platform after the revised Privacy Policy becomes effective, you acknowledge and agree to the updated terms. If you do not agree, you should discontinue use of the Platform.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">16.3–16.5 Additional Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Forti may maintain archived copies of prior versions for reference. All updates are effective as of the date specified at the top. For questions about changes, contact privacy@forti.com.
                </p>
              </section>

              {/* 17. Contact Information */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">17. Contact Information</h2>

                <div className="bg-secondary/50 border border-border rounded-lg p-6 mb-4">
                  <p className="text-foreground font-medium mb-2">Data Protection Officer / Privacy Contact</p>
                  <p className="text-muted-foreground">Forti – Privacy Team</p>
                  <p className="text-muted-foreground">Email: privacy@forti.com</p>
                </div>

                <div className="bg-secondary/50 border border-border rounded-lg p-6 mb-4">
                  <p className="text-foreground font-medium mb-2">Support Contact for Data Requests</p>
                  <p className="text-muted-foreground">Support Email: support@forti.com</p>
                  <p className="text-muted-foreground">In-App Support: Available through the Forti Application under Help or Support</p>
                </div>

                <div className="bg-secondary/50 border border-border rounded-lg p-6">
                  <p className="text-foreground font-medium mb-2">Business and Mailing Address</p>
                  <p className="text-muted-foreground">Forti Technologies, Inc.</p>
                  <p className="text-muted-foreground">600 Brickell Ave., Ste 3600</p>
                  <p className="text-muted-foreground">Miami, FL 33131</p>
                  <p className="text-muted-foreground">United States</p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
      
      <FortiFooter />
    </div>
  );
};

export default PrivacyPolicy;
