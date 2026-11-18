import { parseStopCode, stopDeepLink } from '../qr';

describe('parseStopCode', () => {
  it('aceita o deep link do app', () => {
    expect(parseStopCode('sbp://parada/340015550')).toBe('340015550');
  });

  it('aceita o deep link do app com barra final', () => {
    expect(parseStopCode('sbp://parada/12345/')).toBe('12345');
  });

  it('aceita o link curto de divulgação', () => {
    expect(parseStopCode('https://sbp.app/p/340015550')).toBe('340015550');
  });

  it('aceita http (não só https) no link curto', () => {
    expect(parseStopCode('http://sbp.app/p/340015550')).toBe('340015550');
  });

  it('aceita o código numérico isolado', () => {
    expect(parseStopCode('340015550')).toBe('340015550');
  });

  it('ignora espaços nas pontas', () => {
    expect(parseStopCode('  340015550  ')).toBe('340015550');
  });

  it('rejeita texto sem código', () => {
    expect(parseStopCode('não é um código')).toBeNull();
  });

  it('rejeita URL de outro domínio', () => {
    expect(parseStopCode('https://outro.app/p/340015550')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(parseStopCode('')).toBeNull();
  });
});

describe('stopDeepLink', () => {
  it('monta o deep link a partir do código', () => {
    expect(stopDeepLink('340015550')).toBe('sbp://parada/340015550');
  });
});
