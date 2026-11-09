# Plano de Implementação: Exigências e Critérios de Autorização por Categoria de Corrida no RACE

Apresentar ao profissional, tanto na tela de escolha de modalidades quanto dentro da página de cadastro, **todas as exigências, critérios regulatórios e checklist de conformidade obrigatórios** para autorizar o credenciamento nas 4 categorias de trabalho no RACE em Indaiatuba.

---

## 1. Visão Geral dos Requisitos por Categoria

### A. Motorista Econômico (R$ 2,50/km · 100% Livre)
- **Condutor:** CNH definitiva com anotação **EAR (Exerce Atividade Remunerada)** ativa; idade mínima de 21 anos; atestado de antecedentes criminais sem apontamentos impeditivos.
- **Veículo:** Carro hatch ou sedã popular de 4 portas, capacidade para 5 ocupantes, ano de fabricação **2012 ou superior**, ar-condicionado em pleno funcionamento, cintos de 3 pontos para todos.
- **Documentação:** Licenciamento e CRLV veicular vigentes em dia.
- **Operação & Financeiro:** Suporte veicular seguro para smartphone com carregador; chave PIX para repasse direto de 100% do valor da corrida; assinatura semanal de R$ 200,00 via PIX (`9d9e5635-9e68-46bf-bffe-08bdae29c8ba`).

### B. Motorista Confort (R$ 3,50/km · Exige Carro 2020+)
- **Condutor:** CNH definitiva com anotação **EAR** ativa; antecedentes criminais limpos; histórico de condução exemplar.
- **Veículo:** Veículo novo ou seminovo com ano de fabricação **2020 ou superior (validação estrita)**; modelos sedã médio/grande, SUV ou premium (Corolla, Civic, Compass, T-Cross, Renegade, Virtus, Nivus, Tracker); 4 portas, ar-condicionado obrigatório em todas as viagens; porta-malas espaçoso.
- **Documentação:** CRLV regularizado; seguro veicular compatível.
- **Operação & Financeiro:** Carregador rápido para passageiros; chave PIX cadastrada; assinatura semanal de R$ 200,00 via PIX.

### C. Motoboy Passageiro / Moto Táxi (R$ 1,80/km)
- **Condutor:** CNH categoria **A** definitiva com anotação **EAR** ativa (mínimo de 2 anos de CNH A); antecedentes criminais limpos; uso de colete ou vestimenta com faixas retrorrefletivas.
- **Moto:** Cilindrada mínima entre 125cc e 300cc; pneus e freios revisados; alças de apoio lateral e pedaleiras para garupa firmes.
- **Equipamentos de Segurança Obrigatórios:**
  - **2 Capacetes com selo INMETRO** e viseiras transparentes sem riscos (1 para o condutor e 1 para o passageiro);
  - **Toucas descartáveis higiênicas** fornecidas obrigatoriamente a cada passageiro transportado.
- **Operação & Financeiro:** Suporte de celular com fixação de guidão antivibração; chave PIX cadastrada; assinatura semanal de R$ 200,00 via PIX.

### D. Motoboy Entregas / Flash & Delivery (R$ 2,00/km)
- **Condutor:** CNH categoria **A** com anotação **EAR** ativa; antecedentes criminais limpos.
- **Moto & Compartimento de Carga:**
  - Compartimento homologado pelo CONTRAN: **Baú rígido fixado (80L, 90L ou 120L)** com faixas refletivas OU **Mochila/Bag térmica impermeável (até 20kg)** com isolamento térmico;
  - Proibido transporte de passageiros simultaneamente a entregas.
- **Operação & Financeiro:** Capa de proteção de chuva e suporte estanque para smartphone; chave PIX cadastrada; assinatura semanal de R$ 200,00 via PIX.

---

## 2. Mudanças de Interface e Experiência do Usuário

### 1. Na Tela "Quero trabalhar no Race" (`DriverWorkSelectionView.tsx`)
- **Cards Aprimorados com Tags de Exigências:**
  - Cada um dos 4 cards de escolha ganha um painel integrado destacando os 3 principais requisitos de homologação (ex.: `CNH EAR Obrigatória`, `Ano 2020+`, `2 Capacetes INMETRO`).
  - Botão interativo `"Ver Exigências Completas"` que expande uma gaveta com a lista oficial de exigências antes do profissional clicar para prosseguir.

### 2. Dentro do Formulário de Cadastro (`fill_details`)
- **Painel de Exigências Regulatórias da Categoria:**
  - Bloco em destaque com fundo escuro e bordas na cor da categoria exibindo:
    1. *Exigências do Condutor* (CNH com EAR, Antecedentes, Idade mínima);
    2. *Exigências do Veículo* (Portas, Ar-condicionado, Ano mínimo e modelo);
    3. *Equipamentos e Segurança Obrigatórios* (Capacetes/Baú/Suporte).
- **Campos Operacionais Específicos:**
  - Inserção do número da CNH e confirmação de anotação EAR;
  - Seletor do ano com trava automática (rejeição automática de veículos anteriores a 2020 na categoria Confort);
  - Para Motoboy Passageiro: confirmação explícita da disponibilidade de 2 capacetes INMETRO e toucas descartáveis;
  - Para Motoboy Entregas: especificação do tipo de compartimento (Baú 80L, 90L, 120L ou Bag Térmica);
- **Checklist de Conformidade e Autorização:**
  - 3 checkboxes obrigatórios para autorizar a submissão do cadastro:
    1. `[x] Declaro possuir CNH definitiva com anotação EAR ativa e certidão de antecedentes criminais sem restrições.`
    2. `[x] Atesto que meu veículo cumpre todas as exigências técnicas, de segurança e de ano da categoria selecionada.`
    3. `[x] Estou ciente da assinatura semanal de R$ 200 via PIX (9d9e5635-9e68-46bf-bffe-08bdae29c8ba) com 100% dos ganhos livres.`

### 3. Na Tela de Ativação e Assinatura PIX (`pay_pix`)
- Exibe o resumo da homologação aprovada com os dados do condutor e do veículo.
- Mantém o banner oficial:
  > **"Agora pague R$200/semana PIX 9d9e5635-9e68-46bf-bffe-08bdae29c8ba para liberar"**
- Botão de cópia rápida da chave PIX e confirmação para liberar o recebimento de corridas daquela categoria.

---

## 3. Arquivos Envolvidos
1. `src/components/DriverWorkSelectionView.tsx`: Estruturação do catálogo de exigências completas, renderização nos 4 cards de escolha, painel detalhado dentro do formulário e checklist de conformidade.
2. `src/types/index.ts`: Ajustes e tipagem de campos de conformidade se necessário.
3. `src/services/vehicleValidationService.ts`: Validações de conformidade de ano e modelo Confort.

---

## 4. Verificação e Testes
- Testar a seleção de cada uma das 4 categorias de trabalho e conferir a visualização de todas as exigências.
- Testar a validação de ano para a categoria Confort (bloqueando anos inferiores a 2020 e autorizando 2020+).
- Validar se o checklist bloqueia o envio caso algum termo obrigatório não esteja assinalado.
- Validar a persistência correta dos dados e transição para o pagamento semanal via PIX.
- Executar `compile_applet` e `lint_applet` para garantir 0 erros de compilação.
