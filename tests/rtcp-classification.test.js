const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function isRTCPPacket(d){');
const end = html.indexOf('\nfunction tryRTP(d){', start);
assert.notEqual(start, -1, 'isRTCPPacket must exist in index.html');
assert.notEqual(end, -1, 'isRTCPPacket must appear immediately before tryRTP');

const context = {};
vm.runInNewContext(html.slice(start, end) + '\nthis.isRTCPPacket = isRTCPPacket;', context);
const isRTCPPacket = context.isRTCPPacket;

function rtcpHeader(packetType, wordsMinusOne, count = 0) {
  const length = (wordsMinusOne + 1) * 4;
  const packet = new Uint8Array(length);
  packet[0] = 0x80 | count;
  packet[1] = packetType;
  packet[2] = (wordsMinusOne >>> 8) & 0xff;
  packet[3] = wordsMinusOne & 0xff;
  return packet;
}

test('recognizes a valid RTCP Sender Report', () => {
  assert.equal(isRTCPPacket(rtcpHeader(200, 6)), true); // 28-byte SR
});

test('recognizes a valid RTCP Receiver Report', () => {
  assert.equal(isRTCPPacket(rtcpHeader(201, 1)), true); // 8-byte RR
});

test('recognizes compound RTCP packets', () => {
  const sr = rtcpHeader(200, 6);
  const sdes = rtcpHeader(202, 1);
  const compound = new Uint8Array(sr.length + sdes.length);
  compound.set(sr);
  compound.set(sdes, sr.length);
  assert.equal(isRTCPPacket(compound), true);
});

test('does not classify ordinary RTP as RTCP', () => {
  const rtp = new Uint8Array(160);
  rtp[0] = 0x80;
  rtp[1] = 0xe8; // marker=1, RTP payload type 104
  assert.equal(isRTCPPacket(rtp), false);
});

test('rejects truncated or internally inconsistent RTCP lengths', () => {
  const truncated = rtcpHeader(201, 4); // claims 20 bytes, carries only 8
  assert.equal(isRTCPPacket(truncated), false);

  const undersizedSr = rtcpHeader(200, 1); // SR requires at least 28 bytes
  assert.equal(isRTCPPacket(undersizedSr), false);
});

test('rejects invalid RTCP padding', () => {
  const padded = rtcpHeader(201, 1);
  padded[0] |= 0x20;
  padded[padded.length - 1] = 0;
  assert.equal(isRTCPPacket(padded), false);
});
