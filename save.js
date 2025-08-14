import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { answers, meta } = req.body;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `results/${meta.type}-${timestamp}.json`;
  const fileContent = JSON.stringify({ meta, answers }, null, 2);

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: 'mcallefi', // SEU USUÁRIO DO GITHUB
      repo: 'ISM-ajuste', // O NOME DO SEU REPOSITÓRIO
      path: fileName,
      message: `Add new ISM-SSIM result from ${timestamp}`,
      content: Buffer.from(fileContent).toString('base64'),
    });

    res.status(200).json({ message: 'Dados salvos no GitHub com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar no GitHub:', error);
    res.status(500).json({ message: 'Erro ao salvar no GitHub.' });
  }
}