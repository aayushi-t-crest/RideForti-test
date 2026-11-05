import FortiHeader from "@/components/FortiHeader";
import FortiFooter from "@/components/FortiFooter";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <FortiHeader />
      
      <main className="pt-24 pb-16">
        <div className="forti-container">
          <div className="max-w-4xl mx-auto">
            <h1 className="forti-heading-lg mb-4">Forti Terms & Conditions</h1>
            <p className="text-muted-foreground mb-12">Last Updated: 10/27/2026</p>
            
            <div className="prose prose-invert max-w-none space-y-8">

              <section id="sms">
                <h2 className="text-xl font-semibold mb-4 text-foreground">SMS Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Program name: Ride Forti. Users who opt in may receive messages about quotes, bookings, ride updates and support. Message frequency varies. Message and data rates may apply. Reply STOP to cancel. Reply HELP for help. Carriers are not liable for delayed or undelivered messages.
                </p>
              </section>

              {/* 1. Introduction */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">1. Introduction</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.1 Agreement to Terms</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Forti Technologies, Inc., including its subsidiaries, affiliates, officers, directors, employees, agents, contractors, and assigns (collectively, "Forti," "Company," "we," "us," or "our"), governing your access to and use of:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>The Forti mobile application(s)</li>
                  <li>The Forti website</li>
                  <li>Any associated software, platforms, APIs, or services</li>
                  <li>All related content, functionality, and features</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">(collectively, the "Platform")</p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By accessing, registering for, downloading, installing, or using the Platform in any manner, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you do not agree to these Terms, you must immediately discontinue use of the Platform.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.2 Nature of the Platform</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti operates a technology platform that facilitates connections between independent service providers and users seeking transportation and related services. Depending on your role, you may use the Platform as:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>A Rider or Customer</li>
                  <li>A Driver</li>
                  <li>A Security Guard</li>
                  <li>An Escort</li>
                  <li>A Fleet Operator</li>
                  <li>Or another authorized service provider</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti does not directly provide transportation services, security services, escort services, or armed protection services unless explicitly stated in writing. Such services are provided by independent third-party service providers.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti's role is limited to providing a technology platform that enables booking, coordination, communication, and payment processing between users and independent providers.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.3 Binding Effect</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms apply to all users of the Platform, including but not limited to Riders, Drivers, Guards, and Escorts. Your continued use of the Platform constitutes ongoing acceptance of these Terms. If you are using the Platform on behalf of a company, entity, or organization, you represent and warrant that you have the authority to bind that entity to these Terms.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.4 Modifications to Terms</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti reserves the right, in its sole discretion, to modify or update these Terms at any time. When changes are made, the updated Terms will be posted on the Platform, the "Effective Date" will be revised, and continued use of the Platform after updates constitutes acceptance of the revised Terms. If you do not agree to any modifications, your sole remedy is to discontinue use of the Platform.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.5 Additional Policies</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your use of the Platform is also subject to additional policies, which may include: Privacy Policy, Community Guidelines, Subscription Terms, Cancellation Policies, Payment Policies, and Provider Agreements. In the event of a conflict between these Terms and a separate written agreement signed by you and Forti, the signed agreement shall control.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.6 Electronic Communications</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By using the Platform, you consent to receive electronic communications from Forti, including but not limited to transactional emails, account notifications, push notifications, and legal notices. SMS messages are sent only to users who separately opt in and are subject to the SMS Terms above. You agree that electronic communications satisfy any legal requirement that such communications be in writing.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">1.7 Geographic Scope</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform is intended for use only in jurisdictions where such services are legally permitted. You are solely responsible for ensuring your use of the Platform complies with applicable local, state, and federal laws.
                </p>
              </section>

              {/* 2. Definitions */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">2. Definitions</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">The following definitions apply throughout these Terms:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong className="text-foreground">"Account"</strong> means a unique record registered with the Platform that identifies a User and allows access to certain Platform features.</li>
                  <li><strong className="text-foreground">"Add-On Services"</strong> means optional services offered through the Platform that may incur additional charges, including but not limited to security guards, escorts, armored vehicle features, premium amenities, or other services selected by a Rider.</li>
                  <li><strong className="text-foreground">"Affiliate"</strong> means any entity that directly or indirectly controls, is controlled by, or is under common control with Forti.</li>
                  <li><strong className="text-foreground">"Application" or "App"</strong> means the mobile application(s) provided by Forti through which Users access Platform services.</li>
                  <li><strong className="text-foreground">"Available Provider"</strong> means a Service Provider who is eligible and available to accept ride requests, security assignments, or other service requests through the Platform.</li>
                  <li><strong className="text-foreground">"Booking"</strong> means a confirmed request for a ride or service initiated through the Platform by a Rider and accepted by a Service Provider.</li>
                  <li><strong className="text-foreground">"Cancellation Fee"</strong> means a fee charged to a Rider or Service Provider based on the Forti cancellation policy.</li>
                  <li><strong className="text-foreground">"Charges"</strong> means fees, fares, taxes, tolls, surcharges, add-on fees, subscription charges, and any other amounts payable by a User.</li>
                  <li><strong className="text-foreground">"Connect Account"</strong> means a financial account created through Stripe Connect or similar payment providers used to manage Provider earnings.</li>
                  <li><strong className="text-foreground">"Content"</strong> means all text, images, graphics, video, audio, files, metadata, and other material that appears on the Platform.</li>
                  <li><strong className="text-foreground">"Driver"</strong> means a User authorized by Forti to provide transportation services through the Platform.</li>
                  <li><strong className="text-foreground">"Escort"</strong> means a User authorized to provide security escort services through the Platform.</li>
                  <li><strong className="text-foreground">"Fare"</strong> means the total amount charged for a ride, including base fare, distance/time rates, surcharges, tolls, add-on fees, taxes, and any applicable dynamic pricing.</li>
                  <li><strong className="text-foreground">"Guards" or "Security Guard"</strong> means a User authorized to provide security services (armed or unarmed) through the Platform.</li>
                  <li><strong className="text-foreground">"Legal Requirements"</strong> means all applicable federal, state, local, regulatory, statutory, and administrative requirements.</li>
                  <li><strong className="text-foreground">"Payment Provider"</strong> means a third-party service engaged by Forti to process payments.</li>
                  <li><strong className="text-foreground">"Platform"</strong> means Forti's entire technology ecosystem including the Application, website, backend APIs, administrative tools, dashboards, and any associated services.</li>
                  <li><strong className="text-foreground">"Provider" or "Service Provider"</strong> means an independent contractor, driver, guard, escort, fleet operator, or other third party engaged through the Platform to provide services.</li>
                  <li><strong className="text-foreground">"Provider Earnings"</strong> means the amount payable to a Provider for services rendered, net of Forti's commission, fees, and applicable taxes.</li>
                  <li><strong className="text-foreground">"Ride"</strong> means an accepted transportation request placed through the Platform.</li>
                  <li><strong className="text-foreground">"Rider"</strong> means a User who requests and receives transportation services through the Platform.</li>
                  <li><strong className="text-foreground">"SOS / Emergency Service"</strong> means a safety or emergency alert triggered by a User that initiates a predefined emergency response.</li>
                  <li><strong className="text-foreground">"Subscription"</strong> means any paid or free tier of service entitling a User to features on the Platform, including Forti Free, Forti+, Forti X, or any future plans.</li>
                  <li><strong className="text-foreground">"Subscription Fee"</strong> means the recurring or one-time amount charged for access to a Subscription tier.</li>
                  <li><strong className="text-foreground">"Support Ticket"</strong> means a communication initiated by a User through the Platform support system.</li>
                  <li><strong className="text-foreground">"Taxes"</strong> means any applicable taxes, fees, duties, surcharges, or withholdings required by law.</li>
                  <li><strong className="text-foreground">"Third-Party Services"</strong> means services, tools, content, or platforms provided by entities other than Forti.</li>
                  <li><strong className="text-foreground">"You" or "Your"</strong> means the individual or entity accessing or using the Platform.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Words in the singular include the plural and vice-versa. Headings are for convenience only and do not affect interpretation.
                </p>
              </section>

              {/* 3. Eligibility & User Accounts */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">3. Eligibility & User Accounts</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.1 Eligibility Requirements</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To access and use the Platform, you represent and warrant that you are at least eighteen (18) years of age or older, legally competent to enter into binding agreements, authorized to use any payment method you provide, and not currently suspended, barred, or prohibited from using the Platform under these Terms or any applicable Legal Requirements.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.2 Account Registration</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To use certain features of the Platform, you must register for an Account. When creating an Account, you agree to provide true, accurate, current, and complete information; maintain and promptly update your information; and be responsible for all activity that occurs under your Account. Forti may require identity verification or additional documentation at any time.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.3 Account Security</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You are responsible for maintaining the confidentiality of your Account credentials. You agree to immediately notify Forti of any unauthorized use of your Account. Forti is not liable for any loss or damage arising from your failure to comply with this clause.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.4 Restrictions on Account Use</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree that you will not permit others to use your Account, you will not transfer, sell, assign, or share your Account, and that if your Account is compromised, you will notify Forti.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.5 Account Termination or Suspension</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may suspend or terminate your Account at any time, with or without notice and for any reason, including violation of these Terms, fraudulent use, inactivity, failure to verify credentials, or requests from law enforcement. Upon termination, your right to access the Platform will immediately cease.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.6 Multiple Accounts</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may not create more than one Account unless expressly authorized by Forti in writing.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.7 Account Verification</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may require identity verification, documentation, or confirmation at any time for security, legal compliance, or fraud prevention purposes. Failure to complete verification may result in restricted access, suspension, or loss of Account privileges.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.8 Minor Accounts</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you are under the age of eighteen (18), you may not register for an Account or use the Platform. Use by minors is strictly prohibited.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.9 Third-Party Accounts</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Certain aspects of the Platform may allow linking or authentication through Third-Party Services. By linking such accounts, you authorize the Platform to access certain information from those accounts in accordance with their terms.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.10 Restriction on Provider Registration</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Registration as a Driver, Guard, Escort, or other Service Provider is subject to additional terms, background checks, and compliance requirements. Acceptance of these Terms does not guarantee acceptance as a Service Provider.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">3.11 No Unlawful Use</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You agree not to use the Platform for any unlawful purpose or to solicit others to perform unlawful acts.
                </p>
              </section>

              {/* 4. Description of Services */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">4. Description of Services</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.1 General Platform Services</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform provides a technology system that enables Users to request, access, coordinate, and pay for various transportation and related services offered by independent third-party providers.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.2 Rideshare Services</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti's rideshare services include the ability for Users to request transportation from available Drivers through the Platform. Forti does not operate vehicles or directly provide transportation services.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.3 Subscription Tiers</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform may offer multiple subscription tiers, including but not limited to Forti Free, Forti+, and Forti X, each of which may entitle the User to specific features, privileges, and pricing structures. Subscription tier features, pricing, benefits, and eligibility criteria are determined by Forti and may be modified from time to time.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.4 Optional Security Services</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform may allow Users to request optional security services, including Guards, Escorts, armored vehicle services, or other enhanced protective services. Forti does not provide, guarantee, or control the performance of any security services directly.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.5 Live Tracking</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform may provide real-time location tracking of Service Providers during the course of a ride or service. Real-time tracking is a tool provided for convenience and safety, and not a guarantee of safety or performance.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.6 SOS and Emergency Support</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may include SOS or emergency alert functions. Users acknowledge that such features are provided for informational and coordination purposes only, and Forti does not guarantee the response time, availability, or outcome of any emergency services.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.7 Demo and Test Features</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform may include demo, test, or simulation features provided for convenience and demonstration purposes only.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.8 Forti's Role</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You acknowledge that Forti's role is limited to providing the Platform and related technology services. Forti does not operate any vehicle, provide any direct security service, employ Drivers, Guards, Escorts, or other Service Providers, or control the day-to-day operations of any independent Service Provider.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">4.9 Changes to Services</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Forti reserves the right, at any time and without prior notice, to modify, suspend, discontinue, or restrict access to all or any part of the Platform and services.
                </p>
              </section>

              {/* 5. User Obligations and Conduct */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">5. User Obligations and Conduct</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.1 Rider Conduct Standards</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When using the Platform as a Rider, you agree to behave respectfully and lawfully toward all Users and Forti staff; comply with all applicable laws; provide accurate information; and follow instructions provided by Service Providers or Forti.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.2 Driver Conduct Standards</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When using the Platform as a Driver, you agree to provide transportation services in a safe, courteous, professional, and lawful manner; possess and maintain all required licenses, permits, registrations, and insurance; follow all applicable traffic laws; and treat all Users with respect and dignity.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.3 Guard/Escort Conduct Standards</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When using the Platform as a Guard, Escort, or other security Service Provider, you agree to provide services in a professional, lawful, and prudent manner; possess all required licenses and certifications; comply with all applicable safety protocols; and use force only when permitted by applicable law.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.4 Prohibited Activities</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">All Users agree not to engage in:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Violence, threats, intimidation, harassment, discrimination, or any form of unlawful behavior</li>
                  <li>Operating a vehicle or offering security services while under the influence</li>
                  <li>Fraud, deception, misrepresentation, or any behavior intended to exploit others</li>
                  <li>Providing false information regarding identity, credentials, or qualifications</li>
                  <li>Use of weapons except where expressly permitted by applicable law and professional licensing</li>
                  <li>Any conduct that violates applicable laws or third-party policies</li>
                  <li>Recording audio or video of other Users without their express consent where prohibited by law</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">5.5–5.8 Additional Conduct Requirements</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Users must treat all individuals with dignity and respect. Users agree to cooperate with Forti in investigations. Users agree to indemnify Forti from claims arising from their actions. Users acknowledge that Service Providers are independent contractors and not employees of Forti.
                </p>
              </section>

              {/* 6. Booking, Matching & Dispatch */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">6. Booking, Matching & Dispatch</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.1 Ride Request Processing</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When a Rider submits a ride request, the Platform will attempt to match the request with Available Providers based on proximity, subscription tier eligibility, qualification criteria, and internal matching rules. Forti does not guarantee that every ride request will result in a completed ride.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.2 Availability and Acceptance Rules</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Service Providers may accept or decline ride requests. A ride is considered "accepted" only when confirmed through the Platform. Availability is not guaranteed and may change based on real-time conditions.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.3 Matching Algorithm</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform uses automated matching logic. The internal logic and criteria of the matching algorithm are proprietary and may be revised at any time.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.4 Ride Cancellation Policy</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  A Rider may cancel a ride request prior to acceptance without penalty. If cancelled after acceptance, a Cancellation Fee may apply. Forti reserves the right to charge Cancellation Fees and modify cancellation rules at its discretion.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">6.5–6.8 Additional Dispatch Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cancellation Fees will be charged to the Rider's stored payment method. Service Providers may be subject to penalties for excessive cancellations. Forti does not guarantee availability or matching. Service Providers and Riders agree to receive dispatch notifications through the Platform.
                </p>
              </section>

              {/* 7. Subscriptions & Fees */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">7. Subscriptions & Fees</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.1 Subscription Tiers Explained</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may offer multiple subscription tiers, including Forti Free, Forti+, and Forti X. Each tier may entitle Subscribers to specific features, privileges, service levels, and pricing benefits. Forti reserves the right to modify, rename, combine, or discontinue any Subscription Tier at any time.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.2 Subscription Eligibility and Activation</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To subscribe, you must have a valid Forti Account in good standing and provide accurate billing and payment information.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.3 Recurring Billing</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Subscriptions will be billed on a recurring basis according to the plan selected. By selecting a subscription plan, you authorize Forti to charge the applicable Subscription Fee on a recurring basis without additional authorization.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.4 Subscription Fees</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Subscription Fees, including any applicable taxes, processing fees, or surcharges, are your responsibility. Forti may revise Subscription Fees at any time.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.5 Upgrade and Downgrade Terms</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may upgrade between Subscription Tiers through the Platform. Downgrades may be subject to restrictions and will become effective at the start of the next billing cycle.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.6 Trial Periods and Promotions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may offer trial periods or promotional pricing. Unless cancelled prior to the end of the trial period, your subscription will automatically convert to a paid subscription.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.7 Refund Policy</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Subscription Fees are generally non-refundable except as required by applicable law or at Forti's sole discretion. No refunds will be issued for partial subscription periods, unused time, or unused features.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.8 Taxes and Fees</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You are responsible for all applicable taxes, duties, fees, and charges imposed on subscription transactions.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.9 Cancellation of Subscription</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may cancel your subscription at any time through your Account settings. Cancellation will become effective at the end of the current billing period.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">7.10–7.12 Additional Subscription Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Forti may modify subscription terms and pricing at any time. By subscribing, you authorize Forti to verify your payment information and perform fraud prevention checks. Forti reserves the right to suspend or terminate any Subscription Tier for violations of these Terms.
                </p>
              </section>

              {/* 8. Fare Calculation & Payment */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">8. Fare Calculation & Payment</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.1 Fare Components</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">The total Fare may include:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong className="text-foreground">Base Rate</strong> — A fixed fee associated with initiating a ride</li>
                  <li><strong className="text-foreground">Distance-Based Charges</strong> — Charges based on distance traveled</li>
                  <li><strong className="text-foreground">Time Charges</strong> — Charges based on duration, including waiting time and traffic delays</li>
                  <li><strong className="text-foreground">Add-Ons</strong> — Fees for optional services such as security guards, escorts, armored vehicles, or premium amenities</li>
                  <li><strong className="text-foreground">Dynamic Pricing</strong> — Surge pricing based on real-time supply and demand</li>
                  <li><strong className="text-foreground">Taxes and Fees</strong> — Applicable taxes, tolls, service fees, and surcharges</li>
                </ul>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.2 Calculation Methodology</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Fare estimates shown in the Platform are approximations and may vary based on final routing, distance, time, Add-Ons, taxes, and dynamic adjustments.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">8.3–8.10 Payment Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Riders may use supported payment methods including credit/debit cards, Apple Pay, and third-party wallets. Stored payment methods may be used for recurring billing. If a payment attempt fails, you remain obligated to pay. Payment confirmations will be issued after successful processing. Disputes must be submitted through Forti's support. Forti may adjust or correct Charges in cases of error. Cash transactions are not permitted.
                </p>
              </section>

              {/* 9. Provider Payments & Stripe Connect */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">9. Provider Payments & Stripe Connect</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti facilitates payments between Riders and independent Service Providers through integrated payment processing services, including Stripe Connect. Provider Earnings consist of the portion of the total Fare attributable to the service performed, net of Forti's commissions and fees.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Service Providers may be required to create or link a Stripe Connect account to receive payouts. Provider payouts will be initiated in accordance with Forti's scheduled payout cycles. Forti does not guarantee that funds will be available by a specific date.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Providers are responsible for all tax reporting obligations relating to earnings received through the Platform. Forti does not guarantee a minimum level of earnings, minimum number of rides, or any fixed amount of compensation.
                </p>
              </section>

              {/* 10. Ride Cancellation & Refund Policy */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">10. Ride Cancellation & Refund Policy</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.1 Rider Cancellations</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  A Rider may cancel a ride request without being charged a Cancellation Fee if done within the specified timeframe. After acceptance by a Service Provider, a Cancellation Fee may be charged.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.2 Provider Cancellations</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Service Providers may cancel accepted rides for permitted reasons including safety concerns, vehicle issues, or unforeseen circumstances. Forti reserves the right to review repeated cancellations and apply penalties.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">10.3–10.8 Additional Cancellation Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cancellation Fees are determined by Forti's current cancellation policy. Refunds may be issued at Forti's discretion when appropriate. Forti may issue partial refunds or service credits. Disputed Cancellation Fees must be submitted through Forti's support channels. Forti may modify this cancellation and refund policy at any time.
                </p>
              </section>

              {/* 11. User Reviews, Ratings & Feedback */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">11. User Reviews, Ratings & Feedback</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may provide a Rating System that allows Users to rate and provide feedback on services. The Rating System is intended to promote high-quality service and accountability. Forti may use ratings in Provider eligibility, priority matching, and performance evaluations.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Users agree to provide honest, truthful, and respectful ratings based solely on their direct experience. Users agree not to retaliate against other Users for ratings provided in good faith. Service Providers with consistently poor ratings may be subject to reduced priority or removal from the Platform.
                </p>
              </section>

              {/* 12. Safety, Emergency & SOS Services */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">12. Safety, Emergency & SOS Services</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may provide in-app SOS functionality that allows Users to signal an emergency situation. By using SOS Functionality, you authorize Forti to share your emergency contact information, real-time location, and ride details with designated contacts, law enforcement, or emergency responders as permitted by law.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  SOS features are provided for informational and coordination purposes only. Users agree that personal safety is their responsibility. Forti does not guarantee your safety or the safety of others. By using the Platform, you expressly acknowledge and accept that all rides, security services, and related activities involve inherent risks.
                </p>
              </section>

              {/* 13. Live Tracking & Location Data */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">13. Live Tracking & Location Data</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By using the Platform, you consent to Forti's collection, processing, and use of your geographic location information for live tracking, routing, ride matching, safety monitoring, SOS features, and other functionality. The Platform may request access to background location services for real-time tracking, route optimization, and emergency support.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti will retain your Location Data in accordance with its Privacy Policy and applicable laws. You may disable background location collection at any time, but doing so may limit or prevent certain functionality. Forti makes no warranty that live tracking features will be accurate, timely, or uninterrupted.
                </p>
              </section>

              {/* 14. Content & Communication */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">14. Content & Communication</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may provide communication tools including in-app messaging and chat. All Messages must be lawful, professional, respectful, and relevant. Users shall not send content that is obscene, harassing, threatening, discriminatory, or that promotes unlawful activity.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may record, store, access, and analyze Messages for quality assurance, dispute resolution, safety monitoring, and compliance. Users are solely responsible for the content of their Messages. Users should not expect a right to privacy for communications transmitted through the Platform.
                </p>
              </section>

              {/* 15. Privacy & Data Protection */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">15. Privacy & Data Protection</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your use of the Platform is governed by Forti's Privacy Policy, incorporated into these Terms by reference. By using the Platform, you consent to Forti's collection, processing, and use of your personal information as described in the Privacy Policy.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may share your data with Service Providers as necessary to facilitate services, and with third-party vendors including payment processors, identity verification services, and mapping providers. Forti employs industry-standard safeguards to protect personal information but cannot guarantee complete security. The Platform is not directed at children under eighteen (18).
                </p>
              </section>

              {/* 16. Intellectual Property */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">16. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  All intellectual property rights in and to the Platform are the exclusive property of Forti or its licensors. Subject to your compliance with these Terms, Forti grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform solely for personal, non-commercial purposes.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may not reproduce, duplicate, copy, sell, or exploit any portion of the Platform; modify, reverse engineer, decompile, or disassemble the Platform; or use Forti's trademarks without prior written consent. You retain ownership of User Content you submit but grant Forti a worldwide, perpetual, royalty-free license to use such content for operating the Platform.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Forti respects intellectual property rights. If you believe your work has been infringed, you may provide written notice pursuant to Forti's designated copyright policy.
                </p>
              </section>

              {/* 17. Third-Party Services */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">17. Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Platform integrates with third-party services including mapping and geolocation providers (e.g., Google Maps, Apple Maps), payment processors (e.g., Stripe, Apple Pay), chat providers, and background verification providers. Your use of such services is subject to their respective terms and privacy policies.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Forti does not control, endorse, or guarantee the performance, availability, or security of third-party services. Reference to any third-party service does not constitute endorsement. Forti may modify, replace, or discontinue access to any third-party services at any time.
                </p>
              </section>

              {/* 18. Disclaimers & Limitation of Liability */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">18. Disclaimers & Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed mb-4 uppercase text-xs tracking-wide">
                  THE PLATFORM, SERVICES, AND THIRD-PARTY INTEGRATIONS ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. FORTI MAKES NO REPRESENTATION OR WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, REGARDING THE OPERATION, PERFORMANCE, AVAILABILITY, OR RELIABILITY OF THE PLATFORM. FORTI SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR TITLE.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4 uppercase text-xs tracking-wide">
                  FORTI DISCLAIMS ANY LIABILITY FOR THE ACTIONS, OMISSIONS, CONDUCT, OR PERFORMANCE OF ANY SERVICE PROVIDER. FORTI IS NOT RESPONSIBLE FOR THIRD-PARTY ACTIONS. NEITHER FORTI NOR ANY OF ITS AFFILIATES SHALL BE LIABLE FOR EVENTS OUTSIDE OF FORTI'S REASONABLE CONTROL (FORCE MAJEURE).
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4 uppercase text-xs tracking-wide">
                  IN NO EVENT SHALL FORTI'S AGGREGATE LIABILITY EXCEED THE AMOUNTS ACTUALLY PAID BY YOU TO FORTI IN THE TWELVE (12) MONTH PERIOD PRECEDING THE CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100.00), WHICHEVER IS LESS. NOTHING IN THIS SECTION SHALL EXCLUDE LIABILITY FOR FRAUD, DEATH, OR PERSONAL INJURY CAUSED BY GROSS NEGLIGENCE OR WILLFUL MISCONDUCT.
                </p>
              </section>

              {/* 19. Indemnification */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">19. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree to indemnify, defend, and hold harmless Forti and its Affiliates from and against any claims, demands, liabilities, losses, damages, fines, penalties, costs, and expenses arising out of your breach of these Terms; your use of or inability to use the Platform; your interactions with any third party; your negligent or willful acts; your violation of any applicable law; your violation of any third-party right; any claims related to your User Content; or any dispute between you and any other User.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  These indemnification obligations survive the termination of these Terms and are in addition to any other rights and remedies available to Forti.
                </p>
              </section>

              {/* 20. Dispute Resolution */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">20. Dispute Resolution</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.1 Governing Law</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of the State of Texas, United States, without regard to its conflict of law principles.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.2 Informal Resolution</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Before initiating any formal dispute resolution, you agree to first contact Forti and attempt to resolve the issue informally by sending a written notice to legal@forti.com.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.3 Mandatory Binding Arbitration</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Any dispute arising out of these Terms shall be resolved by final and binding arbitration administered by the American Arbitration Association (AAA). The arbitration shall take place in Harris County, Texas.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.4 Exclusions from Arbitration</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The following are not subject to arbitration: actions for injunctive relief regarding intellectual property; claims to collect amounts owed; disputes required by law to be decided by a court; and small claims matters.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.5 Waiver of Jury Trial</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You and Forti expressly waive any right to a trial by jury.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.6 Class Action Waiver</h3>
                <p className="text-muted-foreground leading-relaxed mb-4 uppercase text-xs tracking-wide">
                  YOU AND FORTI AGREE THAT EACH PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">20.7–20.9 Additional Dispute Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Arbitration procedure includes written notice filing, reasonable discovery, and a written decision. Each party bears its own attorneys' fees unless the arbitrator determines a claim was frivolous. Any claim must be filed within one (1) year after the claim arose, or it is forever barred.
                </p>
              </section>

              {/* 21. Termination of Access */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">21. Termination of Access</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may terminate your access at any time by discontinuing use, deleting the application, or providing notice through your Account settings. Forti may terminate, suspend, or restrict your access at any time, for any reason, including violation of these Terms, fraudulent use, security concerns, or requests by law enforcement.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Upon termination, your right to use the Platform will immediately cease. Outstanding Charges remain due. Forti may retain or delete Account information as described in the Privacy Policy. Forti shall not be liable for termination, suspension, or restriction of access. Reinstatement of terminated Accounts is at Forti's sole discretion.
                </p>
              </section>

              {/* 22. Modifications to Terms */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">22. Modifications to Terms</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti reserves the right to modify these Terms at any time. Forti will provide notice of changes by posting updated Terms on the Platform, sending email or push notifications, or including in-app notifications. Your continued use after the revised Terms become effective constitutes acceptance. Modifications will not apply retroactively unless expressly stated.
                </p>
              </section>

              {/* 23. Severability */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">23. Severability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect. Any invalid provision shall be deemed modified to the minimum extent necessary to make it valid and enforceable.
                </p>
              </section>

              {/* 24. Notice */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">24. Notice</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Forti may provide you with notices through email, in-app notification, push notification, Platform posting, or SMS/text message. You agree that such methods constitute legally valid notice. You are responsible for maintaining accurate contact information in your Account.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  To provide notice to Forti, you may send written correspondence to the contact information provided in the Platform's Help, Support, or Legal section.
                </p>
              </section>

              {/* 25. Miscellaneous */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">25. Miscellaneous</h2>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.1 Entire Agreement</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms, together with the Privacy Policy, constitute the entire agreement between you and Forti concerning your use of the Platform.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.2 Assignment of Rights</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may not assign, delegate, or transfer any rights or obligations under these Terms without Forti's prior written consent. Forti may freely assign its rights and obligations.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.3 Interpretation</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Headings and section titles are for convenience only. The words "include" and "including" shall be deemed followed by "without limitation." The singular includes the plural and vice versa.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.4 No Waiver</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  No failure or delay by Forti in exercising any right under these Terms shall operate as a waiver thereof.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.5 Equitable Relief</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You acknowledge that a breach of these Terms may cause Forti irreparable harm for which monetary damages may be inadequate. Forti may seek injunctive relief without posting a bond or proving actual damages.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.6 No Third-Party Beneficiaries</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms do not confer any rights upon any person or entity other than you and Forti.
                </p>

                <h3 className="text-lg font-medium mb-3 text-foreground">25.7 Survival</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All provisions which by their nature should survive termination shall survive, including provisions regarding ownership rights, disclaimers, limitation of liability, indemnification, dispute resolution, and governing law.
                </p>
              </section>

              {/* 26. Contact Information */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">26. Contact Information</h2>
                <div className="bg-secondary/50 border border-border rounded-lg p-6 mb-4">
                  <p className="text-foreground font-medium mb-2">Forti Technologies, Inc.</p>
                  <p className="text-muted-foreground">600 Brickell Ave., Ste 3600</p>
                  <p className="text-muted-foreground">Miami, FL 33131</p>
                  <p className="text-muted-foreground">United States</p>
                  <p className="text-muted-foreground mt-2">Email: legal@forti.com</p>
                  <p className="text-muted-foreground">Website: https://www.rideforti.com</p>
                </div>
                <div className="bg-secondary/50 border border-border rounded-lg p-6">
                  <p className="text-foreground font-medium mb-2">Support Contact</p>
                  <p className="text-muted-foreground">Support Email: support@forti.com</p>
                  <p className="text-muted-foreground">In-App Support: Access through "Help" or "Support"</p>
                  <p className="text-muted-foreground">Support hours: 9:00 a.m. – 6:00 p.m. CST, Monday through Friday</p>
                </div>
              </section>

              {/* 27. Insurance Requirements for Service Providers */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">27. Insurance Requirements for Service Providers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All Service Providers must maintain and provide proof of valid and adequate insurance coverage as required by applicable law and Forti policy, including commercial auto liability, professional liability, general liability, workers' compensation, and any additional coverage required for security, armored, or specialized services. Forti makes no representation that insurance maintained by Service Providers will cover all liabilities.
                </p>
              </section>

              {/* 28. Accessibility Commitment */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">28. Accessibility Commitment</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Forti is committed to providing a Platform that is accessible to all users, including individuals with disabilities. Forti will strive to comply with applicable accessibility standards, including WCAG and ADA best practices. Nothing in this section shall create a private right of action or any obligation beyond what is required by applicable law.
                </p>
              </section>

              {/* 29. Refund & Chargeback Policy */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">29. Refund & Chargeback Policy (Detailed)</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Refunds for services, subscriptions, or Charges are governed by Forti's billing, cancellation, and payment dispute policies. In the case of chargebacks, disputes, or payment reversals, Forti may investigate, adjust Charges, and take corrective action including offsetting future payouts to Providers or recouping amounts due. You agree to cooperate with Forti and its payment processors in resolving chargebacks and payment disputes.
                </p>
              </section>

              {/* 30. Service Availability & Geographic Restrictions */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">30. Service Availability & Geographic Restrictions</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Forti's services, features, pricing, and availability may vary by location and may be restricted in certain regions. Forti does not guarantee that the Platform's services will be available in all geographic areas. Users are responsible for complying with all local laws, licensing, registrations, and requirements.
                </p>
              </section>

              {/* 31. Insurance Requirements for Providers */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">31. Insurance Requirements for Providers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Service Providers must maintain and produce proof of valid and adequate insurance coverage as required by applicable law and Forti's policy standards, including commercial auto liability, professional liability, general liability, workers' compensation, and any additional insurance mandated for specialized services. Forti makes no guarantees that Provider insurance will cover all liabilities.
                </p>
              </section>

              {/* 32. Safety Reporting & Mandatory Cooperation */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">32. Safety Reporting & Mandatory Cooperation</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Users agree to promptly report safety incidents, misconduct, threats, assaults, traffic violations, or violations of these Terms through Forti's in-app reporting tools. You agree to cooperate fully and truthfully with any safety-related investigations, providing necessary documentation, witness accounts, or evidence as requested.
                </p>
              </section>

              {/* 33. Advertising & Promotional Communications */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">33. Advertising & Promotional Communications</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Forti may send Users promotional communications regarding updates, offers, new features, rewards, or partner services. You can opt out of non-transactional marketing communications at any time through your Account settings. You may opt out of all SMS messages, including transactional SMS, at any time by replying STOP; SMS messages require separate opt-in consent.
                </p>
              </section>

              {/* 34. Electronic Signatures & Records */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">34. Electronic Signatures & Records</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By using the Platform and providing electronic assent to these Terms, you consent to the use of electronic records, signatures, communications, and storage. Electronic agreements shall be treated as legally binding to the same extent as handwritten or paper records under applicable law.
                </p>
              </section>

              {/* 35. User Representations & Warranties */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">35. User Representations & Warranties</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By using the Platform, you represent and warrant that you meet all eligibility requirements, are legally authorized to engage in ride requests or service provision, hold all required licenses and credentials for your role, and will comply with all applicable laws. False representations may result in immediate suspension or termination and legal liability.
                </p>
              </section>

              {/* 36. Platforms & Devices */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">36. Platforms & Devices</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Forti supports specific device platforms, operating system versions, and hardware configurations as described on the Platform documentation. Forti is not responsible for compatibility issues arising from unsupported devices, outdated software, modified operating systems, or user device malfunctions.
                </p>
              </section>

              {/* 37. Beta Features & Experimental Releases */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">37. Beta Features & Experimental Releases</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Forti may release features in beta or experimental status. Use of beta features is voluntary and may be unstable, subject to change, or withdrawn. Beta features are provided "as is," and Forti makes no warranties regarding their performance or suitability.
                </p>
              </section>

              {/* 38. Feedback License */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">38. Feedback License</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you provide feedback, suggestions, ideas, or recommendations regarding the Platform, you grant Forti a perpetual, worldwide, irrevocable, royalty-free, sublicensable, transferable license to use, modify, implement, commercialize, and exploit such Feedback without obligation to attribute or compensate you.
                </p>
              </section>

              {/* 39. Confidentiality */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">39. Confidentiality</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Users acknowledge that certain data, business models, pricing algorithms, technology, internal workflows, and system designs used by Forti constitute proprietary and confidential information. You agree not to access, disclose, copy, reverse engineer, analyze, or disseminate Forti's confidential information except as required to use the Platform in accordance with these Terms.
                </p>
              </section>

              {/* 40. Non-Solicitation */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-foreground">40. Non-Solicitation</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Users may not, directly or indirectly, solicit, recruit, hire, or attempt to engage Forti's employees, contractors, Service Providers (Drivers, Guards, Escorts), or representatives for any employment, consulting, partnership, or contractor engagement outside of the Forti Platform during their engagement and for a period of twelve (12) months following termination of any Platform relationship.
                </p>
              </section>

            </div>
          </div>
        </div>
      </main>
      
      <FortiFooter />
    </div>
  );
};

export default TermsAndConditions;
