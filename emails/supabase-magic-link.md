<!--
  AMTBCF Magic Link email template
  - Purpose: Custom Supabase Auth “Magic Link” email.
  - How to use: Copy/paste into Supabase Studio → Authentication → Email Templates → Magic Link.
  - Variables: Use Studio’s “Insert variable” for {{ .ActionLink }} and {{ .SiteURL }} when editing there.
  - Logo: Cloudinary-optimized, retina-ready URL (uploaded as brand/logo-email).
  - Style: Matches the app’s dark, rounded-card auth look with green CTA.
-->
<!doctype html>
<html lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>AMTBCF Magic Link</title>
  <style>:root{color-scheme:light dark;supported-color-schemes:light dark}</style>
  <!--
    Note: If you change the logo asset, keep the Cloudinary transforms small & fast.
    Example for another size: /image/upload/f_auto,q_auto:eco,w_200,dpr_2/brand/logo-email
  -->
  <!--
    Cloudinary asset (primed):
    https://res.cloudinary.com/db30opamb/image/upload/f_auto,q_auto:eco,w_160,dpr_2/brand/logo-email.png
  -->
  <!--
    Supabase variables (insert via Studio):
      - {{ .ConfirmationURL }} : the magic-link URL for this email template
      - {{ .SiteURL }}         : your site base URL
    Note: Some projects do not expose {{ .ActionLink }}; use {{ .ConfirmationURL }} instead.
  -->
  <!-- Keep table-based layout and inline styles for wide client compatibility. -->
</head>
<body style="margin:0;padding:0;background:#0B0F14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B0F14;padding:24px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#111827;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.35)">
          <!-- Header with Cloudinary logo -->
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #1f2937;background:#111827;text-align:center">
              <img
                src="https://res.cloudinary.com/db30opamb/image/upload/f_auto,q_auto:eco,w_160,dpr_2/brand/logo-email.png"
                alt="AMTBCF"
                width="80" height="80"
                style="display:block;border-radius:12px;margin:0 auto"
              />
              <div style="margin-top:8px;font-size:12px;color:#9CA3AF;font-weight:600;letter-spacing:.2px">AMTBCF · 中佛州净宗学会</div>
            </td>
          </tr>

          <!-- Title + copy -->
          <tr>
            <td style="padding:28px;background:#111827">
              <div style="font-size:22px;font-weight:800;color:#F9FAFB;margin-bottom:8px">Magic Link · 登录链接</div>
              <div style="font-size:14px;color:#D1D5DB;line-height:1.6;margin-bottom:20px">
                Click the button below to sign in to AMTBCF.<br/>
                点击下方按钮登录 AMTBCF。
              </div>

              <!-- Primary CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0">
                <tr>
                  <td align="center" bgcolor="#22C55E" style="border-radius:10px">
                    <a href="{{ .ConfirmationURL }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:700;color:#0B0F14;text-decoration:none;background:#22C55E;border-radius:10px">
                      Log In · 登录
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <div style="font-size:13px;color:#9CA3AF;line-height:1.6">
                If the button doesn’t work, copy and paste this link:<br/>
                如果按钮无效，请复制粘贴以下链接：
              </div>
              <div style="font-size:13px;margin-top:8px;word-break:break-all">
                <a href="{{ .ConfirmationURL }}" target="_blank" rel="noopener noreferrer" style="color:#93C5FD;text-decoration:underline">{{ .ConfirmationURL }}</a>
              </div>

              <!-- Info / security -->
              <div style="font-size:12px;color:#6B7280;line-height:1.6;margin-top:20px">
                This link is valid for 15 minutes and can be used only once.<br/>
                此链接有效期 15 分钟且仅可使用一次。
              </div>
              <div style="font-size:12px;color:#6B7280;line-height:1.6;margin-top:8px">
                If you didn’t request this, you can safely ignore this email.<br/>
                如果这不是你发起的请求，请忽略此邮件。
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #1f2937;color:#6B7280;font-size:12px;background:#111827">
              <a href="{{ .SiteURL }}" target="_blank" rel="noopener noreferrer" style="color:#9CA3AF;text-decoration:none">Visit AMTBCF</a>
            </td>
          </tr>
        </table>
        <div style="font-size:0;line-height:0;height:20px">&nbsp;</div>
      </td>
    </tr>
  </table>
</body>
</html>
