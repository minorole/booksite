<!--
  AMTBCF Magic Link email template (Simple Light)
  - Purpose: Custom Supabase Auth “Magic Link” email.
  - How to use: Copy/paste into Supabase Studio → Authentication → Email Templates → Magic Link.
  - Variables (insert via Studio): {{ .ConfirmationURL }} and {{ .SiteURL }} — do not change.
  - Logo: Cloudinary URL below (retina-friendly).
-->
<!doctype html>
<html lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AMTBCF Magic Link</title>
  
</head>
<body bgcolor="#ffffff" style="margin:0;padding:0;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Sign in to AMTBCF. Link valid for 15 minutes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background:#ffffff">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <!-- Centered logo -->
          <tr>
            <td align="center" style="padding:28px 28px 12px 28px">
              <img
                src="https://res.cloudinary.com/db30opamb/image/upload/f_auto,q_auto:eco,w_160,dpr_2/brand/logo-email.png"
                alt="AMTBCF"
                width="72" height="72"
                style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none"
              />
              <div style="margin-top:8px;font-size:12px;letter-spacing:.2px">AMTBCF · 中佛州净宗学会</div>
            </td>
          </tr>

          <!-- Title + brief copy -->
          <tr>
            <td align="center" style="padding:0 28px 8px 28px">
              <div style="font-size:28px;font-weight:700;line-height:1.25">Sign in to AMTBCF<br/>登录 AMTBCF</div>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:0 28px 24px 28px">
              <div style="font-size:16px;line-height:1.6;color:#444444;text-align:left">Click the button below to continue.<br/>点击下方按钮继续。</div>
            </td>
          </tr>

          <!-- Primary CTA (outline, black text) -->
          <tr>
            <td align="center" style="padding:0 28px 24px 28px">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 24px;font-size:16px;line-height:1.2;font-weight:700;color:#111111;text-decoration:none;background:#ffffff;border:2px solid #111111;border-radius:8px">
                      Open Magic Link · 打开登录链接
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 28px">
              <div style="font-size:14px;line-height:1.6;color:#555555">If the button doesn’t work, copy and paste this link:<br/>如果按钮无效，请复制粘贴以下链接：</div>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 28px 0 28px">
              <a href="{{ .ConfirmationURL }}" target="_blank" rel="noopener noreferrer" style="font-size:14px;line-height:1.5;color:#111111;text-decoration:underline;word-break:break-all">{{ .ConfirmationURL }}</a>
            </td>
          </tr>

          <!-- Info / security -->
          <tr>
            <td style="padding:16px 28px 0 28px">
              <div style="font-size:12px;line-height:1.6;color:#666666">This link is valid for 15 minutes and can be used only once.<br/>此链接有效期 15 分钟且仅可使用一次。</div>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 28px 24px 28px">
              <div style="font-size:12px;line-height:1.6;color:#666666">If you didn’t request this, you can safely ignore this email.<br/>如果这不是你发起的请求，请忽略此邮件。</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:1px solid #e5e7eb;padding:16px 28px">
              <a href="{{ .SiteURL }}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#111111;text-decoration:underline">Visit AMTBCF</a>
            </td>
          </tr>
        </table>
        <div style="height:20px;line-height:20px;font-size:0">&nbsp;</div>
      </td>
    </tr>

  </table>
</body>
</html>
