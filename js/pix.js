(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EmunahPix = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NAME = 'GIVALDO SILVA CONCEICAO';
  var CITY = 'SAO PAULO';
  var TXID = '***';

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function crc16(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function emv(id, value) {
    var len = String(value.length);
    if (value.length < 10) len = '0' + len;
    return id + len + value;
  }

  function amountToBRCode(amount) {
    var n;
    if (typeof amount === 'number' && isFinite(amount)) {
      n = amount;
    } else {
      var s = String(amount).replace(/[^\d.,]/g, '');
      if (!s) return null;
      if (s.indexOf(',') >= 0) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (s.indexOf('.') >= 0 && s.indexOf('.') !== s.lastIndexOf('.')) {
        s = s.replace(/\./g, '');
      }
      n = parseFloat(s);
    }
    if (isNaN(n) || n <= 0) return null;
    return n.toFixed(2);
  }

  function buildPayload(opts) {
    opts = opts || {};
    var key = String(opts.key || '').trim();
    if (!key) throw new Error('Chave Pix obrigatória');
    var amount = amountToBRCode(opts.amount);
    if (amount === null) throw new Error('Valor inválido');
    var name = String(opts.name || NAME).trim().toUpperCase();
    if (name.length > 25) name = name.slice(0, 25);
    var city = String(opts.city || CITY).trim().toUpperCase();
    if (city.length > 15) city = city.slice(0, 15);

    var mai = emv('00', 'br.gov.bcb.pix') + emv('01', key);
    var base = emv('00', '01') +
      emv('26', mai) +
      emv('52', '0000') +
      emv('53', '986') +
      emv('54', amount) +
      emv('58', 'BR') +
      emv('59', name) +
      emv('60', city) +
      emv('62', emv('05', TXID));
    return base + emv('63', crc16(base + '6304'));
  }

  function getQRDataURL(text) {
    if (typeof qrcode === 'undefined') throw new Error('Biblioteca QR não carregada');
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(6, 2);
  }

  return {
    crc16: crc16,
    buildPayload: buildPayload,
    amountToBRCode: amountToBRCode,
    getQRDataURL: getQRDataURL
  };
}));
