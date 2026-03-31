# DashTivi+ Email Templates
## 3 HTML-Ready Emails + Plain Text Versions

---

## 1. WELCOME EMAIL (With Access Code)

**Subject:** Welcome to DashTivi+ — You're In! 🎬⚽

### HTML Version

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DashTivi+</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 20px 10px;">

        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1A1A2E; border-radius: 12px; overflow: hidden;">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #9D4EDD 0%, #FF6B35 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                DashTivi+
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Everything Dey. Watch Am.
              </p>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 30px 30px 20px;">
              <h2 style="margin: 0 0 15px; color: #FFFFFF; font-size: 22px; font-weight: 600;">
                Welcome to the fam! 🎉
              </h2>
              <p style="margin: 0 0 15px; color: #CCCCCC; font-size: 15px; line-height: 1.6;">
                Hey {{name}},
              </p>
              <p style="margin: 0 0 20px; color: #CCCCCC; font-size: 15px; line-height: 1.6;">
                You just joined thousands of people watching live TV, movies, and series on their phone — without a decoder, without a dish, and without DStv prices.
              </p>
            </td>
          </tr>

          <!-- Access Code Box -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #16213E; border-radius: 8px; border: 1px solid #9D4EDD;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #9D4EDD; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                      Your Access Code
                    </p>
                    <p style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: 700; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                      {{access_code}}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How to Start -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <h3 style="margin: 0 0 15px; color: #FF6B35; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                How to Start Watching
              </h3>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 8px 0; color: #CCCCCC; font-size: 15px; line-height: 1.5;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #9D4EDD; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; margin-right: 12px; vertical-align: middle;">1</span>
                    Open your phone browser
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #CCCCCC; font-size: 15px; line-height: 1.5;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #9D4EDD; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; margin-right: 12px; vertical-align: middle;">2</span>
                    Go to <a href="https://tivi.dasuperhub.com" style="color: #FF6B35; text-decoration: none; font-weight: 600;">tivi.dasuperhub.com</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #CCCCCC; font-size: 15px; line-height: 1.5;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #9D4EDD; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; margin-right: 12px; vertical-align: middle;">3</span>
                    Enter your access code above
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #CCCCCC; font-size: 15px; line-height: 1.5;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #9D4EDD; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; margin-right: 12px; vertical-align: middle;">4</span>
                    Tap "Add to Home Screen" for easy access
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #CCCCCC; font-size: 15px; line-height: 1.5;">
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #FF6B35; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; margin-right: 12px; vertical-align: middle;">5</span>
                    Start watching! 📺
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="https://tivi.dasuperhub.com" style="display: inline-block; background: linear-gradient(135deg, #9D4EDD 0%, #7B2FBF 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                OPEN DashTivi+ NOW
              </a>
            </td>
          </tr>

          <!-- What's Waiting -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <h3 style="margin: 0 0 15px; color: #FF6B35; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                What's Waiting for You
              </h3>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 6px 0; color: #CCCCCC; font-size: 14px;">⚽ Live Sports — EPL, Champions League, La Liga, AFCON</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #CCCCCC; font-size: 14px;">🎬 Movies — Hollywood, Nollywood, Bollywood, thousands of titles</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #CCCCCC; font-size: 14px;">📺 Series — Drama, comedy, thriller, K-drama, Turkish series</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #CCCCCC; font-size: 14px;">👶 Kids — Safe channels for your little ones</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #CCCCCC; font-size: 14px;">🎵 Music — MTV, Trace, and more</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #CCCCCC; font-size: 14px;">📰 News — BBC, CNN, Al Jazeera, African news</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Account Info -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #16213E; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Account</p>
                    <p style="margin: 0 0 4px; color: #CCCCCC; font-size: 14px;">Code: <strong style="color: #fff;">{{access_code}}</strong></p>
                    <p style="margin: 0 0 4px; color: #CCCCCC; font-size: 14px;">Plan: <strong style="color: #fff;">{{plan_name}}</strong></p>
                    <p style="margin: 0; color: #CCCCCC; font-size: 14px;">Active Until: <strong style="color: #FF6B35;">{{expiry_date}}</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; border-top: 1px solid #2A2A4A; text-align: center;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 13px;">
                Need help? Reply to this email or WhatsApp us at +232 XX XXXXXX
              </p>
              <p style="margin: 0 0 15px; color: #999999; font-size: 13px;">
                Share DASH with a friend — they sign up, you get <strong style="color: #FF6B35;">1 week FREE</strong>.
              </p>
              <p style="margin: 0; color: #666666; font-size: 11px;">
                DASH — Everything Dey. Watch Am.<br>
                <a href="https://tivi.dasuperhub.com" style="color: #9D4EDD; text-decoration: none;">tivi.dasuperhub.com</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->

      </td>
    </tr>
  </table>

</body>
</html>
```

### Plain Text Version

```
WELCOME TO DashTivi+!
=====================

Hey {{name}}!

Welcome to the fam. You just joined thousands of people watching live TV, movies, and series on their phone — without a decoder, without a dish, and without DStv prices.

YOUR ACCESS CODE: {{access_code}}

HOW TO START WATCHING:
1. Open your phone browser
2. Go to tivi.dasuperhub.com
3. Enter your access code
4. Tap "Add to Home Screen" for easy access
5. Start watching!

WHAT'S WAITING FOR YOU:
- Live Sports — EPL, Champions League, La Liga, AFCON
- Movies — Hollywood, Nollywood, Bollywood
- Series — Drama, comedy, thriller, K-drama
- Kids — Safe channels for your little ones
- Music — MTV, Trace, and more
- News — BBC, CNN, Al Jazeera

YOUR ACCOUNT:
- Code: {{access_code}}
- Plan: {{plan_name}}
- Active Until: {{expiry_date}}
- App: tivi.dasuperhub.com

Need help? Reply to this email or WhatsApp: +232 XX XXXXXX

Share DASH with a friend. When they sign up, you get 1 week FREE.

— The DASH Team
tivi.dasuperhub.com
```

---

## 2. "WHAT'S ON THIS WEEK" DIGEST

**Subject:** This Week on DASH: {{headline_match}} + New Movies 🔥

### HTML Version

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What's On DashTivi+ This Week</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 20px 10px;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1A1A2E; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9D4EDD 0%, #7B2FBF 100%); padding: 30px; text-align: center;">
              <p style="margin: 0 0 5px; color: rgba(255,255,255,0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">DashTivi+</p>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700;">
                What's On This Week 📺
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 25px 30px 15px;">
              <p style="margin: 0; color: #CCCCCC; font-size: 15px; line-height: 1.6;">
                Hey {{name}}, here's your entertainment lineup for the week. Football, movies, and plenty to binge.
              </p>
            </td>
          </tr>

          <!-- Football Section -->
          <tr>
            <td style="padding: 10px 30px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #16213E; border-radius: 8px; border-left: 4px solid #FF6B35;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px; color: #FF6B35; font-size: 16px; font-weight: 700;">
                      ⚽ FOOTBALL THIS WEEK
                    </h3>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; color: #999; font-size: 13px; width: 90px; vertical-align: top;">Tuesday</td>
                        <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px;">Champions League — {{tue_match_1}} &bull; {{tue_match_2}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #999; font-size: 13px; vertical-align: top;">Wednesday</td>
                        <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px;">Champions League — {{wed_match_1}} &bull; {{wed_match_2}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #999; font-size: 13px; vertical-align: top;">Saturday</td>
                        <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px;">Premier League — {{sat_match_1}} &bull; {{sat_match_2}} &bull; {{sat_match_3}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #999; font-size: 13px; vertical-align: top;">Sunday</td>
                        <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px;">Premier League — {{sun_match_1}} &bull; La Liga — {{sun_match_2}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Movies Section -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #16213E; border-radius: 8px; border-left: 4px solid #9D4EDD;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px; color: #9D4EDD; font-size: 16px; font-weight: 700;">
                      🎬 NEW MOVIES & SERIES
                    </h3>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 5px 0; color: #CCCCCC; font-size: 14px;">
                          &bull; <strong style="color: #fff;">{{movie_1_title}}</strong> — {{movie_1_genre}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #CCCCCC; font-size: 14px;">
                          &bull; <strong style="color: #fff;">{{movie_2_title}}</strong> — {{movie_2_genre}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #CCCCCC; font-size: 14px;">
                          &bull; <strong style="color: #fff;">{{series_title}}</strong> — New episodes dropped
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #CCCCCC; font-size: 14px;">
                          &bull; <strong style="color: #fff;">{{movie_3_title}}</strong> — {{movie_3_genre}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Editor's Pick -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #16213E 0%, #1A1A3E 100%); border-radius: 8px; border: 1px solid #9D4EDD;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 5px; color: #FF6B35; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">🔥 Pick of the Week</p>
                    <p style="margin: 0 0 8px; color: #FFFFFF; font-size: 16px; font-weight: 600;">{{pick_title}}</p>
                    <p style="margin: 0; color: #CCCCCC; font-size: 14px; line-height: 1.5;">{{pick_description}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="https://tivi.dasuperhub.com" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700;">
                OPEN DASH & WATCH
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2A2A4A; text-align: center;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 13px;">
                See you at kick-off. 🤝
              </p>
              <p style="margin: 0 0 10px; color: #666666; font-size: 12px;">
                Share DASH with a friend — they sign up, you get 1 week FREE.
              </p>
              <p style="margin: 0; color: #666666; font-size: 11px;">
                DASH — Everything Dey. Watch Am.<br>
                <a href="https://tivi.dasuperhub.com" style="color: #9D4EDD; text-decoration: none;">tivi.dasuperhub.com</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
```

### Plain Text Version

```
WHAT'S ON DashTivi+ THIS WEEK
==============================

Hey {{name}}, here's your entertainment lineup.

FOOTBALL THIS WEEK
------------------
Tuesday:   Champions League — {{tue_match_1}} | {{tue_match_2}}
Wednesday: Champions League — {{wed_match_1}} | {{wed_match_2}}
Saturday:  Premier League — {{sat_match_1}} | {{sat_match_2}} | {{sat_match_3}}
Sunday:    Premier League — {{sun_match_1}} | La Liga — {{sun_match_2}}

NEW MOVIES & SERIES
-------------------
- {{movie_1_title}} — {{movie_1_genre}}
- {{movie_2_title}} — {{movie_2_genre}}
- {{series_title}} — New episodes dropped
- {{movie_3_title}} — {{movie_3_genre}}

PICK OF THE WEEK
----------------
{{pick_title}}
{{pick_description}}

Open DASH and watch now:
>> tivi.dasuperhub.com

See you at kick-off.

— DASH Team

Share DASH with a friend > they sign up > you get 1 week FREE.
tivi.dasuperhub.com
```

---

## 3. RENEWAL REMINDER (7 Days Before Expiry)

**Subject:** Your DashTivi+ expires in 7 days — don't miss the weekend matches ⚽

### HTML Version

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DashTivi+ Renewal Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0D0D0D;">
    <tr>
      <td align="center" style="padding: 20px 10px;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1A1A2E; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #16213E; padding: 30px; text-align: center;">
              <p style="margin: 0 0 5px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">DashTivi+</p>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 700;">
                Your subscription expires soon
              </h1>
            </td>
          </tr>

          <!-- Countdown -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #16213E; border: 2px solid #FF6B35; border-radius: 12px; padding: 20px 35px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #FF6B35; font-size: 42px; font-weight: 800; line-height: 1;">7</p>
                    <p style="margin: 0; color: #999; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">days left</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <p style="margin: 0 0 15px; color: #CCCCCC; font-size: 15px; line-height: 1.6;">
                Hey {{name}},
              </p>
              <p style="margin: 0 0 15px; color: #CCCCCC; font-size: 15px; line-height: 1.6;">
                Your DashTivi+ subscription expires on <strong style="color: #FF6B35;">{{expiry_date}}</strong>. After that, you go lose access to all 9,000+ channels — football, movies, series, everything.
              </p>
              <p style="margin: 0 0 20px; color: #CCCCCC; font-size: 15px; line-height: 1.6;">
                Don't let that happen. Renew now and keep watching without interruption.
              </p>
            </td>
          </tr>

          <!-- What You'll Miss -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #16213E; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; color: #FFFFFF; font-size: 15px; font-weight: 600;">
                      Coming up you don't want to miss:
                    </h3>
                    <p style="margin: 0 0 6px; color: #CCCCCC; font-size: 14px;">⚽ {{upcoming_match_1}}</p>
                    <p style="margin: 0 0 6px; color: #CCCCCC; font-size: 14px;">⚽ {{upcoming_match_2}}</p>
                    <p style="margin: 0 0 6px; color: #CCCCCC; font-size: 14px;">🎬 {{upcoming_movie}}</p>
                    <p style="margin: 0; color: #CCCCCC; font-size: 14px;">📺 {{upcoming_series}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pricing Options -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <h3 style="margin: 0 0 15px; color: #FF6B35; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Renewal Options
              </h3>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 10px 15px; background-color: #16213E; border-radius: 6px; margin-bottom: 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #FFFFFF; font-size: 14px; font-weight: 600;">Weekly</td>
                        <td style="color: #FF6B35; font-size: 14px; font-weight: 700; text-align: right;">SLE 8</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 6px;"></td></tr>
                <tr>
                  <td style="padding: 10px 15px; background-color: #16213E; border-radius: 6px; border: 1px solid #9D4EDD;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #FFFFFF; font-size: 14px; font-weight: 600;">Monthly <span style="color: #9D4EDD; font-size: 11px; font-weight: 400;">BEST VALUE</span></td>
                        <td style="color: #FF6B35; font-size: 14px; font-weight: 700; text-align: right;">SLE 25</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 6px;"></td></tr>
                <tr>
                  <td style="padding: 10px 15px; background-color: #16213E; border-radius: 6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="color: #FFFFFF; font-size: 14px; font-weight: 600;">Quarterly <span style="color: #9D4EDD; font-size: 11px; font-weight: 400;">SAVE 20%</span></td>
                        <td style="color: #FF6B35; font-size: 14px; font-weight: 700; text-align: right;">SLE 60</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Methods -->
          <tr>
            <td style="padding: 0 30px 25px;">
              <p style="margin: 0 0 10px; color: #999; font-size: 13px;">Pay via:</p>
              <p style="margin: 0; color: #CCCCCC; font-size: 14px;">
                📱 Orange Money &bull; Afrimoney &bull; Cash to your DASH Agent
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="https://tivi.dasuperhub.com" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #E85D2C 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700;">
                RENEW NOW
              </a>
              <p style="margin: 12px 0 0; color: #666; font-size: 12px;">
                Or WhatsApp us: +232 XX XXXXXX
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2A2A4A; text-align: center;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 13px;">
                Don't miss out. Football season dey hot right now. 🔥
              </p>
              <p style="margin: 0; color: #666666; font-size: 11px;">
                DASH — Everything Dey. Watch Am.<br>
                <a href="https://tivi.dasuperhub.com" style="color: #9D4EDD; text-decoration: none;">tivi.dasuperhub.com</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
```

### Plain Text Version

```
YOUR DashTivi+ EXPIRES IN 7 DAYS
==================================

Hey {{name}},

Your DashTivi+ subscription expires on {{expiry_date}}.

After that, you go lose access to 9,000+ channels — football, movies, series, everything.

COMING UP (DON'T MISS THIS):
- {{upcoming_match_1}}
- {{upcoming_match_2}}
- {{upcoming_movie}}
- {{upcoming_series}}

RENEWAL OPTIONS:
- Weekly:    SLE 8
- Monthly:   SLE 25 (Best Value)
- Quarterly: SLE 60 (Save 20%)

PAY VIA:
- Orange Money
- Afrimoney
- Cash to your DASH Agent

Renew now: tivi.dasuperhub.com
Or WhatsApp us: +232 XX XXXXXX

Don't miss the weekend matches.

— DASH Team
tivi.dasuperhub.com
```

---

*All templates use inline CSS for email client compatibility. Mobile-responsive with max-width: 600px. Dark theme matching DashTivi+ brand colors: Purple (#9D4EDD), Orange (#FF6B35), Dark backgrounds (#0D0D0D, #1A1A2E, #16213E). Template variables in {{double_braces}} for easy replacement.*
