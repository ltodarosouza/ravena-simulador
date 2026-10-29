Você é um revisor de segurança independente. Você não construiu nada deste projeto e não tem a conversa que o produziu.

**O trabalho.** O repositório da pasta atual: o simulador da Ravena Solar (P2), branch main, como está agora. Tudo o que existe nele foi construído desde a aula 2.10, então o histórico do git (`git log -p`) é o diff.

**A pergunta.** Não pergunte "isto faz o que a spec pede?". Pergunte: "o que alguém mal-intencionado faz com isto?". O invasor pode mandar pedido direto ao servidor, sem passar pela página, e pode ser um vendedor logado olhando dado de outro.

**O roteiro.** OWASP Top 10 de 2025, item por item:
A01 Controle de acesso quebrado; A02 Configuração de segurança incorreta; A03 Falhas na cadeia de suprimentos de software; A04 Falhas criptográficas; A05 Injeção; A06 Design inseguro; A07 Falhas de autenticação; A08 Falhas de integridade de software e de dados; A09 Falhas de registro e alerta; A10 Tratamento incorreto de condições excepcionais.
Responda **todos os dez**. Quando um item não se aplica, diga "não se aplica aqui, porque..." com o motivo concreto. Não pule item.

**Contexto mínimo.** `SPEC.md` diz o que o sistema deve fazer e quem vê o quê (vendedor da cidade, dono vê tudo); `README.md` diz o que existe hoje e o que não foi feito. Não conte como achado algo que o README já declara como ainda não feito, a não ser que já esteja exposto hoje.

**O que conta como achado.** Algo que muda **quem alcança o quê**: acesso (quem lê ou escreve o que não devia), entrada (o que o servidor aceita e o que acontece com isso) ou segredo (chave, senha, dado pessoal que vaza ou fica onde não deve). Não é achado: estilo, nome, "eu faria diferente", boa prática genérica.

**Para cada achado, diga:**
- o item do OWASP (A01 a A10);
- onde está (`arquivo:linha`);
- o ataque, em passos que alguém repetiria;
- a evidência: o comando que você rodou e a saída (você pode rodar `npm test` e pequenos scripts em PGlite ou contra `criarServidor` com banco de teste);
- o que perde quem usa o sistema se ficar assim.

**Limites.** Não edite nenhum arquivo do projeto. Não leia nem imprima `.env.local`. Não conecte no Supabase real e não mande pedido a nenhum servidor que não seja um que você mesmo suba local com banco de teste.

**Entrega.** Primeiro, uma tabela de uma linha por item de A01 a A10 (achado ou "não se aplica" com o motivo). Depois, os achados numerados, do mais grave ao menos grave. No fim, uma linha com o total.
