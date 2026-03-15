#!/usr/bin/env python3
"""
Resend the 211 wave-1 investor emails using the correct template.
"""

import os
import sys
import time
import json
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

import resend

resend.api_key = os.getenv("RESEND_API_KEY", "").strip()

PITCH_DECK_URL = "https://palmcareai.com/PalmCare_Full_v4.pdf"

SKIP_EMAILS = {
    "jamie@thecreatorfund.com",
}

WAVE1_RECIPIENTS = [
    {"fund_name": "Pear VC", "contact_email": "vivien@pear.vc", "contact_name": "Vivien Tsao"},
    {"fund_name": "7wireVentures", "contact_email": "info@7wireventures.com", "contact_name": ""},
    {"fund_name": "Virtue VC", "contact_email": "sd@virtuevc.com", "contact_name": "Sean Doolan"},
    {"fund_name": "Pioneer Fund Future of Health", "contact_email": "dave@pioneerfund.vc", "contact_name": "Dave Messina"},
    {"fund_name": "Third Act Ventures", "contact_email": "max@thirdact.vc", "contact_name": "Max Zamkow"},
    {"fund_name": "Longevitytech.fund", "contact_email": "info@longevitytech.fund", "contact_name": ""},
    {"fund_name": "Healthspan Capital", "contact_email": "info@healthspancapital.vc", "contact_name": ""},
    {"fund_name": "Rhia Ventures", "contact_email": "info@rhiaventures.org", "contact_name": ""},
    {"fund_name": "Town Hall Ventures", "contact_email": "ir@townhallventures.com", "contact_name": "Andy Slavitt"},
    {"fund_name": "Sequential Ventures", "contact_email": "info@sequentialvc.com", "contact_name": "Roberto Rodriguez"},
    {"fund_name": "Valtruis", "contact_email": "partnering@valtruis.com", "contact_name": ""},
    {"fund_name": "Pave Health Ventures", "contact_email": "investments@pavehealthventures.com", "contact_name": "Jacob Ritter Myers"},
    {"fund_name": ".406 Ventures", "contact_email": "contact@406ventures.com", "contact_name": ""},
    {"fund_name": "Catalyst Health Ventures", "contact_email": "info@chv.vc", "contact_name": ""},
    {"fund_name": "Ascension Ventures", "contact_email": "info@ascensionventures.org", "contact_name": "John Kuelper"},
    {"fund_name": "Ziegler Link-age Funds", "contact_email": "kschmitz@ziegler.com", "contact_name": "Katie Schmitz"},
    {"fund_name": "Woodlawn Health Ventures", "contact_email": "info@woodlawnhv.com", "contact_name": "Brian Lang"},
    {"fund_name": "Martin Ventures", "contact_email": "devin@martinventures.com", "contact_name": "Devin Carty"},
    {"fund_name": "Digitalis Ventures", "contact_email": "info@digitalisventures.com", "contact_name": ""},
    {"fund_name": "Coyote Ventures", "contact_email": "jessica@coyote.ventures", "contact_name": "Jessica"},
    {"fund_name": "Epsilon Health Investors", "contact_email": "info@epsilonhi.com", "contact_name": ""},
    {"fund_name": "Excelerate Health Ventures", "contact_email": "entrepreneurs@exceleratehealth.com", "contact_name": ""},
    {"fund_name": "Frist Cressey Ventures", "contact_email": "info@fcventures.com", "contact_name": "Navid Farzad"},
    {"fund_name": "F-Prime Capital", "contact_email": "info@fprimecapital.com", "contact_name": ""},
    {"fund_name": "Global Health Impact Fund", "contact_email": "info@globalhealthimpactfund.com", "contact_name": ""},
    {"fund_name": "LRVHealth", "contact_email": "info@lrvhealth.com", "contact_name": ""},
    {"fund_name": "Jumpstart Health Investors", "contact_email": "info@jumpstarthealth.co", "contact_name": ""},
    {"fund_name": "Seae Ventures", "contact_email": "seaevc@seaeventures.com", "contact_name": "Tuoyo Louis"},
    {"fund_name": "Primary Venture Partners", "contact_email": "founders@primary.vc", "contact_name": "Sam Toole"},
    {"fund_name": "Story Ventures", "contact_email": "hello@storyventures.vc", "contact_name": ""},
    {"fund_name": "Maven Ventures", "contact_email": "hello@mavenventures.com", "contact_name": ""},
    {"fund_name": "Khosla Ventures", "contact_email": "kv@khoslaventures.com", "contact_name": ""},
    {"fund_name": "8VC", "contact_email": "info@8vc.com", "contact_name": "Joe Lonsdale"},
    {"fund_name": "New Enterprise Associates (NEA)", "contact_email": "bd@nea.com", "contact_name": "Perry Wallack"},
    {"fund_name": "Lux Capital", "contact_email": "info@luxcapital.com", "contact_name": ""},
    {"fund_name": "Two Sigma Ventures", "contact_email": "pitch@twosigmaventures.com", "contact_name": ""},
    {"fund_name": "Redesign Health", "contact_email": "press@redesignhealth.com", "contact_name": ""},
    {"fund_name": "Olive Tree Ventures", "contact_email": "info@olivetree.vc", "contact_name": ""},
    {"fund_name": "Heritage Group", "contact_email": "info@heritagegroupusa.com", "contact_name": ""},
    {"fund_name": "Chrysalis Ventures", "contact_email": "info@chrysalisventures.com", "contact_name": ""},
    {"fund_name": "HealthTech Capital", "contact_email": "info@healthtechcapital.com", "contact_name": ""},
    {"fund_name": "Kapor Capital", "contact_email": "pitch@kaporcapital.com", "contact_name": "Brian Dixon"},
    {"fund_name": "Noro-Moseley Partners", "contact_email": "info@noromoseley.com", "contact_name": ""},
    {"fund_name": "AgeTech Capital", "contact_email": "info@agetechcapital.com", "contact_name": "Lyne Landry"},
    {"fund_name": "LifeX Ventures", "contact_email": "info@lifexventures.com", "contact_name": ""},
    {"fund_name": "Andreessen Horowitz (a16z Bio+Health)", "contact_email": "menlopark-info@a16z.com", "contact_name": ""},
    {"fund_name": "BioAdvance Capital", "contact_email": "info@bioadvance.com", "contact_name": ""},
    {"fund_name": "Omega Funds", "contact_email": "info@omegafunds.net", "contact_name": ""},
    {"fund_name": "SV Health Investors", "contact_email": "ccappella@svhealthinvestors.com", "contact_name": ""},
    {"fund_name": "Tera Ventures", "contact_email": "info@tera.vc", "contact_name": ""},
    {"fund_name": "Wren Capital", "contact_email": "inquiry@wrencapital.com", "contact_name": ""},
    {"fund_name": "Longitude Capital", "contact_email": "info@longitudecapital.com", "contact_name": ""},
    {"fund_name": "AARP Innovation Fund", "contact_email": "innovation@aarp.org", "contact_name": ""},
    {"fund_name": "General Catalyst", "contact_email": "info@generalcatalyst.com", "contact_name": ""},
    {"fund_name": "Oxeon Partners", "contact_email": "info@oxeon.com", "contact_name": ""},
    {"fund_name": "Avenir Growth Capital", "contact_email": "info@avenirgrowth.com", "contact_name": ""},
    {"fund_name": "Canaan Partners", "contact_email": "info@canaan.com", "contact_name": ""},
    {"fund_name": "Cambia Health Solutions", "contact_email": "info@cambiahealth.com", "contact_name": ""},
    {"fund_name": "Aging 2.0", "contact_email": "info@aging2.com", "contact_name": ""},
    {"fund_name": "Apollo Health Ventures", "contact_email": "info@apollo.vc", "contact_name": ""},
    {"fund_name": "The Longevity Fund", "contact_email": "info@longevity.vc", "contact_name": ""},
    {"fund_name": "HealthQuest Capital", "contact_email": "info@healthquestcapital.com", "contact_name": ""},
    {"fund_name": "Plug and Play Health", "contact_email": "health@pnptc.com", "contact_name": ""},
    {"fund_name": "SignalFire", "contact_email": "hello@signalfire.com", "contact_name": ""},
    {"fund_name": "GV (Google Ventures)", "contact_email": "info@gv.com", "contact_name": ""},
    {"fund_name": "Dorm Room Fund", "contact_email": "hello@dormroomfund.com", "contact_name": ""},
    {"fund_name": "Y Combinator", "contact_email": "apply@ycombinator.com", "contact_name": ""},
    {"fund_name": "MassChallenge HealthTech", "contact_email": "healthtech@masschallenge.org", "contact_name": ""},
    {"fund_name": "HAX (SOSV)", "contact_email": "health@hax.co", "contact_name": ""},
    {"fund_name": "Transformation Capital", "contact_email": "contact@transformcap.com", "contact_name": ""},
    {"fund_name": "LAUNCH Accelerator", "contact_email": "apply@launch.co", "contact_name": ""},
    {"fund_name": "Village Global", "contact_email": "hello@villageglobal.com", "contact_name": ""},
    {"fund_name": "Laconia Capital Group", "contact_email": "info@laconiacapitalgroup.com", "contact_name": ""},
    {"fund_name": "SpringRock Ventures", "contact_email": "info@springrockventures.com", "contact_name": ""},
    {"fund_name": "NextGen Venture Partners", "contact_email": "info@nextgenvp.com", "contact_name": ""},
    {"fund_name": "HealthTech 4 Medicaid", "contact_email": "info@ht4m.org", "contact_name": ""},
    {"fund_name": "Able Partners", "contact_email": "info@able.partners", "contact_name": ""},
    {"fund_name": "Rockies Seed Fund", "contact_email": "info@rockiesseedfund.com", "contact_name": ""},
    {"fund_name": "Denver Ventures", "contact_email": "info@denverventures.co", "contact_name": ""},
    {"fund_name": "Next Level Ventures", "contact_email": "info@nextlevelvc.com", "contact_name": ""},
    {"fund_name": "Flyover Capital", "contact_email": "info@flyovercapital.com", "contact_name": ""},
    {"fund_name": "KCRise Fund", "contact_email": "info@kcventurecapital.com", "contact_name": ""},
    {"fund_name": "Royal Street Ventures", "contact_email": "laura@royalstreet.vc", "contact_name": "Laura"},
    {"fund_name": "Heartland Ventures", "contact_email": "mbrickman@heartlandvc.com", "contact_name": ""},
    {"fund_name": "Lewis & Clark Ventures", "contact_email": "info@lacventures.com", "contact_name": ""},
    {"fund_name": "Cultivation Capital", "contact_email": "info@cultivationcapital.com", "contact_name": ""},
    {"fund_name": "Prolog Ventures", "contact_email": "prolog@prologventures.com", "contact_name": ""},
    {"fund_name": "Groove Capital", "contact_email": "info@groovecap.com", "contact_name": ""},
    {"fund_name": "Gopher Angels", "contact_email": "info@gopherangels.com", "contact_name": ""},
    {"fund_name": "Arboretum Ventures", "contact_email": "info@arboretumvc.com", "contact_name": ""},
    {"fund_name": "Grand Ventures", "contact_email": "info@grandvcp.com", "contact_name": ""},
    {"fund_name": "Michigan Rise", "contact_email": "info@michiganrise.com", "contact_name": ""},
    {"fund_name": "Huron River Ventures", "contact_email": "info@huronrivervc.com", "contact_name": ""},
    {"fund_name": "Hyde Park Venture Partners", "contact_email": "allison@hydeparkvp.com", "contact_name": "Allison"},
    {"fund_name": "7wire Ventures", "contact_email": "info@7wireventures.com", "contact_name": ""},
    {"fund_name": "LongJump VC", "contact_email": "hello@longjump.vc", "contact_name": ""},
    {"fund_name": "Lodi Ventures", "contact_email": "info@lodiventures.com", "contact_name": ""},
    {"fund_name": "LOUD Capital", "contact_email": "loudventures@loudco.com", "contact_name": ""},
    {"fund_name": "Chingona Ventures", "contact_email": "media@chingona.ventures", "contact_name": ""},
    {"fund_name": "Ohio Innovation Fund", "contact_email": "info@ohioinnovationfund.com", "contact_name": ""},
    {"fund_name": "Rev1 Ventures", "contact_email": "info@rev1ventures.com", "contact_name": ""},
    {"fund_name": "CincyTech", "contact_email": "info@cincytechusa.com", "contact_name": ""},
    {"fund_name": "JumpStart Inc", "contact_email": "info@jumpstart.vc", "contact_name": ""},
    {"fund_name": "Drive Capital", "contact_email": "info@drivecapital.com", "contact_name": ""},
    {"fund_name": "Elevate Ventures", "contact_email": "info@elevateventures.com", "contact_name": ""},
    {"fund_name": "Flywheel Fund", "contact_email": "hello@flywheelfund.vc", "contact_name": ""},
    {"fund_name": "Sixty8 Capital", "contact_email": "weare@sixty8.capital", "contact_name": ""},
    {"fund_name": "Allos Ventures", "contact_email": "info@allosventures.com", "contact_name": ""},
    {"fund_name": "High Alpha Capital", "contact_email": "info@highalpha.com", "contact_name": ""},
    {"fund_name": "gener8tor", "contact_email": "info@gener8tor.com", "contact_name": ""},
    {"fund_name": "Valency Fund", "contact_email": "hello@valencyfund.com", "contact_name": ""},
    {"fund_name": "Nebraska Angels", "contact_email": "info@nebraskaangels.org", "contact_name": ""},
    {"fund_name": "Husker Venture Fund", "contact_email": "hvf@unl.edu", "contact_name": ""},
    {"fund_name": "Collab Capital", "contact_email": "founders@collab.capital", "contact_name": ""},
    {"fund_name": "Harlem Capital", "contact_email": "info@harlem.capital", "contact_name": ""},
    {"fund_name": "Black Founders Matter", "contact_email": "info@blackfoundersmatter.org", "contact_name": ""},
    {"fund_name": "Black Star Fund", "contact_email": "info@blackstar.fund", "contact_name": ""},
    {"fund_name": "Fearless Fund", "contact_email": "hello@fearless.fund", "contact_name": ""},
    {"fund_name": "Lightship Capital", "contact_email": "info@lightship.capital", "contact_name": ""},
    {"fund_name": "MaC Venture Capital", "contact_email": "info@macventurecapital.com", "contact_name": "Marlon Nichols"},
    {"fund_name": "Impact America Fund", "contact_email": "info@impactamericafund.com", "contact_name": ""},
    {"fund_name": "Born Global Ventures", "contact_email": "info@bornglobal.vc", "contact_name": ""},
    {"fund_name": "Moontide Capital", "contact_email": "ning@moontidecapital.com", "contact_name": "Ning"},
    {"fund_name": "Unshackled Ventures", "contact_email": "info@unshackledvc.com", "contact_name": ""},
    {"fund_name": "One Way Ventures", "contact_email": "info@onewayvc.com", "contact_name": ""},
    {"fund_name": "Punch Capital", "contact_email": "info@punchcap.com", "contact_name": ""},
    {"fund_name": "Vamos Ventures", "contact_email": "marcos@vamosventures.com", "contact_name": "Marcos"},
    {"fund_name": "Lattitude Ventures", "contact_email": "info@lattitudeventures.com", "contact_name": ""},
    {"fund_name": "Halogen Ventures", "contact_email": "hello@halogenvc.com", "contact_name": ""},
    {"fund_name": "Cleo Capital", "contact_email": "sarah@cleocap.com", "contact_name": "Sarah"},
    {"fund_name": "Cake Ventures", "contact_email": "info@cake.vc", "contact_name": ""},
    {"fund_name": "Concrete Rose Capital", "contact_email": "info@concreterosecapital.com", "contact_name": ""},
    {"fund_name": "Slauson & Co", "contact_email": "info@slauson.co", "contact_name": ""},
    {"fund_name": "Ulu Ventures", "contact_email": "info@uluventures.com", "contact_name": ""},
    {"fund_name": "Elevate Capital", "contact_email": "info@elevatecapital.com", "contact_name": ""},
    {"fund_name": "Health Equity Ventures", "contact_email": "info@healthequityventures.com", "contact_name": ""},
    {"fund_name": "Foreground Capital", "contact_email": "pitch@foreground.vc", "contact_name": ""},
    {"fund_name": "Fabric VC", "contact_email": "info@fabricvc.com", "contact_name": ""},
    {"fund_name": "New Stack Ventures", "contact_email": "info@newstack.vc", "contact_name": ""},
    {"fund_name": "Visible Hands", "contact_email": "info@visiblehands.vc", "contact_name": ""},
    {"fund_name": "Scrub Capital", "contact_email": "info@scrubcapital.com", "contact_name": ""},
    {"fund_name": "Jumpstart Capital", "contact_email": "info@jscap.co", "contact_name": ""},
    {"fund_name": "Jumpstart Foundry", "contact_email": "info@jsf.co", "contact_name": ""},
    {"fund_name": "HealthX Ventures", "contact_email": "info@healthxventures.com", "contact_name": ""},
    {"fund_name": "HIP Fund", "contact_email": "info@hip.fund", "contact_name": ""},
    {"fund_name": "Act One Ventures", "contact_email": "info@actoneventures.com", "contact_name": ""},
    {"fund_name": "Camelback Ventures", "contact_email": "info@camelbackventures.org", "contact_name": ""},
    {"fund_name": "Gaingels", "contact_email": "paulgrossinger@gaingels.com", "contact_name": "Paul Grossinger"},
    {"fund_name": "Innovation Works", "contact_email": "info@innovationworks.org", "contact_name": ""},
    {"fund_name": "Greater Colorado Venture Fund", "contact_email": "info@greatercolorado.vc", "contact_name": ""},
    {"fund_name": "Telluride Venture Fund", "contact_email": "info@tellurideventurefund.com", "contact_name": ""},
    {"fund_name": "Midwest.VC Syndicate", "contact_email": "info@midwest.vc", "contact_name": ""},
    {"fund_name": "Vensana Capital", "contact_email": "info@vensanacap.com", "contact_name": ""},
    {"fund_name": "Vora Ventures", "contact_email": "info@voraventures.com", "contact_name": ""},
    {"fund_name": "iSelect Fund", "contact_email": "info@iselectfund.com", "contact_name": ""},
    {"fund_name": "MD Angels", "contact_email": "info@mdangels.com", "contact_name": ""},
    {"fund_name": "Alas Angels", "contact_email": "info@alasangels.com", "contact_name": ""},
    {"fund_name": "Project Voice Capital Partners", "contact_email": "bradley@pvcp.vc", "contact_name": "Bradley Metrock"},
    {"fund_name": "IA Seed Ventures", "contact_email": "hello@iasv.co", "contact_name": ""},
    {"fund_name": "Fellows Fund", "contact_email": "alex@fellows.fund", "contact_name": "Alex Ren"},
    {"fund_name": "Forum Ventures", "contact_email": "info@forumvc.com", "contact_name": ""},
    {"fund_name": "Recall Capital", "contact_email": "contact@recall.capital", "contact_name": ""},
    {"fund_name": "Leonis Capital", "contact_email": "partners@leoniscap.com", "contact_name": ""},
    {"fund_name": "TipTop VC", "contact_email": "deals@tiptop.vc", "contact_name": ""},
    {"fund_name": "ScOp Ventures", "contact_email": "info@scopvc.com", "contact_name": ""},
    {"fund_name": "INITIATE Ventures", "contact_email": "info@initiate.vc", "contact_name": "Jessica Owens"},
    {"fund_name": "Conversion Capital", "contact_email": "info@conversioncapital.com", "contact_name": "Christian Lawless"},
    {"fund_name": "Decibel Partners", "contact_email": "founders@decibel.vc", "contact_name": ""},
    {"fund_name": "Basis Set Ventures", "contact_email": "lan@basisset.ventures", "contact_name": "Lan Xuezhao"},
    {"fund_name": "Boldstart Ventures", "contact_email": "info@boldstart.vc", "contact_name": "Ed Sim"},
    {"fund_name": "NFX", "contact_email": "qed@nfx.com", "contact_name": "James Currier"},
    {"fund_name": "Contour Venture Partners", "contact_email": "businessplan@contourventures.com", "contact_name": "Matt Gorin"},
    {"fund_name": "Eniac Ventures", "contact_email": "advice@eniac.vc", "contact_name": ""},
    {"fund_name": "Bain Capital Ventures", "contact_email": "ventures@baincapital.com", "contact_name": ""},
    {"fund_name": "Array Ventures", "contact_email": "deals@array.vc", "contact_name": "Shruti Gandhi"},
    {"fund_name": "Notation Capital", "contact_email": "hello@notation.vc", "contact_name": "Nicholas Chirls"},
    {"fund_name": "BoxGroup", "contact_email": "info@boxgroup.com", "contact_name": ""},
    {"fund_name": "Long Journey Ventures", "contact_email": "hi@longjourney.vc", "contact_name": "Lee Jacobs"},
    {"fund_name": "Anthemis Group", "contact_email": "pitch@anthemis.com", "contact_name": ""},
    {"fund_name": "Work-Bench", "contact_email": "info@work-bench.com", "contact_name": "Jonathan Lehr"},
    {"fund_name": "Bonfire Ventures", "contact_email": "info@bonfirevc.com", "contact_name": "Mark Mullen"},
    {"fund_name": "Renegade Partners", "contact_email": "hi@renegadepartners.com", "contact_name": "Renata Quintini"},
    {"fund_name": "Tribe Capital", "contact_email": "hello@tribecap.co", "contact_name": ""},
    {"fund_name": "Good AI Capital", "contact_email": "darwin@goodai.capital", "contact_name": "Darwin Ling"},
    {"fund_name": "500 Global", "contact_email": "ir@500.co", "contact_name": ""},
    {"fund_name": "Conviction", "contact_email": "info@conviction.com", "contact_name": "Sarah Guo"},
    {"fund_name": "Bowery Capital", "contact_email": "loren.straub@bowerycap.com", "contact_name": "Loren Straub"},
    {"fund_name": "Novy Ventures", "contact_email": "david@novyventures.com", "contact_name": "David"},
    {"fund_name": "Gradient Ventures", "contact_email": "info@gradient.com", "contact_name": ""},
    {"fund_name": "Vertical Venture Partners", "contact_email": "info@vvp.vc", "contact_name": ""},
    {"fund_name": "Tusk Venture Partners", "contact_email": "info@tusk.vc", "contact_name": ""},
    {"fund_name": "Glasswing Ventures", "contact_email": "info@glasswing.vc", "contact_name": ""},
    {"fund_name": "Susa Ventures", "contact_email": "info@susaventures.com", "contact_name": "Chad Byers"},
    {"fund_name": "8VC", "contact_email": "info@8vc.com", "contact_name": "Joe Lonsdale"},
    {"fund_name": "Harlem Capital", "contact_email": "info@harlem.capital", "contact_name": ""},
    {"fund_name": "Moxxie Ventures", "contact_email": "info@moxxie.vc", "contact_name": "Katie Jacobs Stanton"},
    {"fund_name": "Flyover Capital", "contact_email": "info@flyovercapital.com", "contact_name": ""},
    {"fund_name": "MaC Venture Capital", "contact_email": "info@macventurecapital.com", "contact_name": "Marlon Nichols"},
    {"fund_name": "1984 Ventures", "contact_email": "info@1984.vc", "contact_name": ""},
    {"fund_name": "Khosla Ventures", "contact_email": "info@khoslaventures.com", "contact_name": ""},
    {"fund_name": "Attack Capital", "contact_email": "info@attack.capital", "contact_name": ""},
    {"fund_name": "NextView Ventures", "contact_email": "info@nextview.vc", "contact_name": ""},
    {"fund_name": "Asymmetric Capital Partners", "contact_email": "info@acp.vc", "contact_name": ""},
    {"fund_name": "Menlo Ventures (Anthology)", "contact_email": "info@menlovc.com", "contact_name": ""},
    {"fund_name": "Plug and Play Tech Center", "contact_email": "info@pnptc.com", "contact_name": ""},
    {"fund_name": "Sapphire Ventures", "contact_email": "info@sapphireventures.com", "contact_name": ""},
    {"fund_name": "Radical Ventures", "contact_email": "info@radical.vc", "contact_name": ""},
    {"fund_name": "Dynamo Ventures", "contact_email": "info@dynamo.vc", "contact_name": ""},
    {"fund_name": "Amplo Ventures", "contact_email": "info@amplovc.com", "contact_name": "Sheel Tyle"},
    {"fund_name": "Soma Capital", "contact_email": "info@somacap.com", "contact_name": ""},
    {"fund_name": "Fika Ventures", "contact_email": "info@fika.vc", "contact_name": "Eva Ho"},
    {"fund_name": "Torch Capital", "contact_email": "info@torchcapital.vc", "contact_name": ""},
    {"fund_name": "Defy Partners", "contact_email": "info@defy.vc", "contact_name": ""},
    {"fund_name": "Picus Capital", "contact_email": "info@picuscap.com", "contact_name": "Alexander Samwer"},
    {"fund_name": "Costanoa Ventures", "contact_email": "info@costanoa.vc", "contact_name": "Greg Sands"},
    {"fund_name": "Propellant Ventures", "contact_email": "info@propellant.vc", "contact_name": ""},
]


def build_email(fund_name, contact_name):
    first_name = contact_name.split()[0] if contact_name and "Team" not in contact_name and "General" not in contact_name and "Inquir" not in contact_name else ""
    greeting = f"Hi {first_name}" if first_name else f"Hi {fund_name} Team"

    subject = "Pre-Seed: Defining the Future of Home Care Operations"

    body = f"""{greeting},

I hope you're well. I'm reaching out to share what we're building at Palm Technologies Inc, a Nebraska-based C-Corp developing an AI-powered platform that automates the patient assessment, care planning, and contracting workflow for home care agencies.

One of the strongest signals that this market is ready for disruption is how little has changed. Home care is a $343B industry processing millions of Medicaid and private-pay assessments every year, and nearly all of it still happens on paper, spreadsheets, and legacy software built two decades ago.

We are raising a $450K seed round via SAFE or convertible note at a $1.8M pre-money valuation.

PalmCare AI Highlights:
- Full platform built and live today
- $399/mo blended ARPU
- 82% gross margin
- Founder with software engineering, B2B sales, and home care experience
- Clean cap table, 100% bootstrapped

Deck: {PITCH_DECK_URL}
Visit: palmcareai.com

Warm regards,
Muse Ibrahim
Founder & CEO, Palm Technologies Inc.
213-569-7693 | invest@palmtai.com"""

    html = f'<pre style="font-family:-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;">{body}</pre>'
    return subject, html, body


def main():
    if not resend.api_key:
        print("ERROR: RESEND_API_KEY not set")
        sys.exit(1)

    recipients = [r for r in WAVE1_RECIPIENTS if r["contact_email"].lower().strip() not in SKIP_EMAILS]

    # Deduplicate by email
    seen = set()
    unique = []
    for r in recipients:
        e = r["contact_email"].lower().strip()
        if e not in seen:
            seen.add(e)
            unique.append(r)

    print(f"Resending {len(unique)} emails with correct template")
    print(f"Resend API key: ...{resend.api_key[-8:]}")
    print(f"Subject: Pre-Seed: Defining the Future of Home Care Operations")

    sent = 0
    failed = 0

    for i, inv in enumerate(unique):
        email_addr = inv["contact_email"]
        fund = inv["fund_name"]

        subject, html, text = build_email(fund, inv.get("contact_name", ""))

        if i > 0:
            time.sleep(1.0)

        try:
            resp = resend.Emails.send({
                "from": "Muse Ibrahim <invest@send.palmtai.com>",
                "to": [email_addr],
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": "invest@palmtai.com",
            })
            print(f"  [{i+1}/{len(unique)}] SENT: {fund} -> {email_addr}")
            sent += 1
        except Exception as e:
            err = str(e)[:80]
            print(f"  [{i+1}/{len(unique)}] FAIL: {fund} -> {email_addr}: {err}")
            failed += 1
            time.sleep(2.0)

        if (i + 1) % 50 == 0:
            print(f"  --- Progress: {sent} sent, {failed} failed ---")

    print(f"\n{'='*60}")
    print(f"DONE: {sent} resent with correct template, {failed} failed")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
