const express = require('express');
const dns = require('dns').promises;
const { SMTPClient } = require('smtp-client');

const app = express();
app.use(express.json());

app.post('/verify', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return res.status(400).json({ valid: false, reason: 'Formato de e-mail inválido' });
  }

  const [user, ...domainParts] = email.split('@');
  const domain = domainParts.join('@');

  let client;
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords.length) throw new Error('Domínio sem registro MX');

    mxRecords.sort((a, b) => a.priority - b.priority);
    const mailServer = mxRecords[0].exchange;

    client = new SMTPClient({
      host: mailServer,
      port: 25,
      timeout: 5000,
    });

    await client.connect();
    await client.greet({ hostname: 'harmonyservices.com.br' });
    await client.mail({ from: 'support@harmonyservices.com.br' });
    await client.rcpt({ to: email });

    return res.json({ valid: true, reason: 'E-mail aceito pelo servidor' });
  } catch (err) {
    return res.json({ valid: false, reason: err.message });
  } finally {
    if (client) {
      try { await client.quit(); } catch (e) { /* ignorar erro ao fechar */ }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
