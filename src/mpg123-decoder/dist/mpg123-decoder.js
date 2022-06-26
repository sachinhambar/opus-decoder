(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('web-worker')) :
  typeof define === 'function' && define.amd ? define(['exports', 'web-worker'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["mpg123-decoder"] = {}, global.Worker));
})(this, (function (exports, Worker) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var Worker__default = /*#__PURE__*/_interopDefaultLegacy(Worker);

  function WASMAudioDecoderCommon(caller) {
    // setup static methods
    const uint8Array = Uint8Array;
    const float32Array = Float32Array;

    if (!WASMAudioDecoderCommon.modules) {
      Object.defineProperties(WASMAudioDecoderCommon, {
        modules: {
          value: new WeakMap(),
        },

        setModule: {
          value(Ref, module) {
            WASMAudioDecoderCommon.modules.set(Ref, Promise.resolve(module));
          },
        },

        getModule: {
          value(Ref, wasmString) {
            let module = WASMAudioDecoderCommon.modules.get(Ref);

            if (!module) {
              if (!wasmString) {
                wasmString = Ref.wasm;
                module = WASMAudioDecoderCommon.inflateDynEncodeString(
                  wasmString
                ).then((data) => WebAssembly.compile(data));
              } else {
                module = WebAssembly.compile(
                  WASMAudioDecoderCommon.decodeDynString(wasmString)
                );
              }

              WASMAudioDecoderCommon.modules.set(Ref, module);
            }

            return module;
          },
        },

        concatFloat32: {
          value(buffers, length) {
            let ret = new float32Array(length),
              i = 0,
              offset = 0;

            while (i < buffers.length) {
              if(typeof buffers[0] == 'number') {
                ret[i] = buffers[i];
                i++;
              }
              else {
                ret.set(buffers[i], offset);
                offset += buffers[i++].length;
              }
            }

            return ret;
          },
        },

        getDecodedAudio: {
          value: (channelData, samplesDecoded, sampleRate) => ({
            channelData,
            samplesDecoded,
            sampleRate,
          }),
        },

        getDecodedAudioMultiChannel: {
          value(input, channelsDecoded, samplesDecoded, sampleRate) {
            let channelData = [],
              i,
              j;

            for (i = 0; i < channelsDecoded; i++) {
              const channel = [];
              if(typeof input[0] == 'number') {
                for (j = 0; j < samplesDecoded; j+=channelsDecoded) channel.push(input[j + i]);
              }
              else {
                for (j = 0; j < input.length; ) channel.push(input[j++][i]);
              }
              channelData.push(
                WASMAudioDecoderCommon.concatFloat32(channel, samplesDecoded)
              );
            }

            return WASMAudioDecoderCommon.getDecodedAudio(
              channelData,
              samplesDecoded,
              sampleRate
            );
          },
        },

        /*
         ******************
         * Compression Code
         ******************
         */

        decodeDynString: {
          value(source) {
            const output = new uint8Array(source.length);
            const offset = parseInt(source.substring(11, 13), 16);
            const offsetReverse = 256 - offset;

            let escaped = false,
              byteIndex = 0,
              byte,
              i = 13;

            while (i < source.length) {
              byte = source.charCodeAt(i++);

              if (byte === 61 && !escaped) {
                escaped = true;
                continue;
              }

              if (escaped) {
                escaped = false;
                byte -= 64;
              }

              output[byteIndex++] =
                byte < offset && byte > 0 ? byte + offsetReverse : byte - offset;
            }

            return output.subarray(0, byteIndex);
          },
        },

        inflateDynEncodeString: {
          value(source) {
            source = WASMAudioDecoderCommon.decodeDynString(source);

            return new Promise((resolve) => {
              // prettier-ignore
              const puffString = String.raw`dynEncode0014u*ttt$#U¤¤U¤¤3yzzss|yusvuyÚ&4<054<,5T44^T44<(6U~J(44< ~A544U~6J0444545 444J0444J,4U4UÒ7U454U4Z4U4U^/6545T4T44BU~64CU~O4U54U~5 U5T4B4Z!4U~5U5U5T4U~6U4ZTU5U5T44~4O4U2ZTU5T44Z!4B6T44U~64B6U~O44U~4O4U~54U~5 44~C4~54U~5 44~5454U4B6Ub!444~UO4U~5 U54U4ZTU#44U$464<4~B6^4<444~U~B4U~54U544~544~U5 µUä#UJUè#5TT4U0ZTTUX5U5T4T4Uà#~4OU4U $~C4~54U~5 T44$6U\!TTT4UaT4<6T4<64<Z!44~4N4<U~5 4UZ!4U±_TU#44UU6UÔ~B$544$6U\!4U6U¤#~B44Uä#~B$~64<6_TU#444U~B~6~54<Y!44<_!T4Y!4<64~444~AN44<U~6J4U5 44J4U[!U#44UO4U~54U~5 U54 7U6844J44J 4UJ4UJ04VK(44<J44<J$4U´~54U~5 4U¤~5!TTT4U$5"U5TTTTTTT4U$"4VK,U54<(6U~64<$6_!4< 64~6A54A544U~6#J(U54A4U[!44J(44#~A4U6UUU[!4464~64_!4<64~54<6T4<4]TU5 T4Y!44~44~AN4U~54U~54U5 44J(44J UÄA!U5U#UôJU"UÔJU#UÔ"JU#U´"JT4U´ZTU5T4UôZTU5T4UDZTU5T4U$[T44~UO4U~5 UÔUô4U~U´$.U5T4UP[T4U~4~UO4U~5 U#<U#<4U~U2$.UÄUN 44 ~UO4U~5 44!~UO4U~5 4U~4~UO4U~5 44J44J(U5 44U¤~J@44Uä~J<44UD~J844U~J44U$54U$5U54U$54U1^4U1^!4U~54U~5U54U~6U4U^/65T4T4U$54U~4BU~4O4U54U~5 UU'464U'_/54UU~5T4T4U~4BU~UO4U54U~5 U54Uä~4U¤~4U~U'$!44~5U5T44\T44U<~$6U\!4U#aT4U~4U~4O4U~5 U5U5U5TTT4U$"4YTU5 4U4~C5U5 U5U5444$4~64~\TU5 4U~4U~5T4Y!44O4U~54U~54U5 4CYTU5 4Uä~4U¤~4U~4$6TU54U\!44Bæ4Bä~[!4U~4UD~4U~4U~4$6TU54U\!44B4B~[!44U<~4U4~$5 4U"U#$544"Y!454U^!44<J44<(J454U~84­UN!#%'+/37?GOWgw·×÷Uä;U9$%& !"#`;

              WASMAudioDecoderCommon.getModule(WASMAudioDecoderCommon, puffString)
                .then((wasm) => WebAssembly.instantiate(wasm, {}))
                .then(({ exports }) => {
                  // required for minifiers that mangle the __heap_base property
                  const instanceExports = new Map(Object.entries(exports));

                  const puff = instanceExports.get("puff");
                  const memory = instanceExports.get("memory")["buffer"];
                  const dataArray = new uint8Array(memory);
                  const heapView = new DataView(memory);

                  let heapPos = instanceExports.get("__heap_base");

                  // source length
                  const sourceLength = source.length;
                  const sourceLengthPtr = heapPos;
                  heapPos += 4;
                  heapView.setInt32(sourceLengthPtr, sourceLength, true);

                  // source data
                  const sourcePtr = heapPos;
                  heapPos += sourceLength;
                  dataArray.set(source, sourcePtr);

                  // destination length
                  const destLengthPtr = heapPos;
                  heapPos += 4;
                  heapView.setInt32(
                    destLengthPtr,
                    dataArray.byteLength - heapPos,
                    true
                  );

                  // destination data fills in the rest of the heap
                  puff(heapPos, destLengthPtr, sourcePtr, sourceLengthPtr);

                  resolve(
                    dataArray.slice(
                      heapPos,
                      heapPos + heapView.getInt32(destLengthPtr, true)
                    )
                  );
                });
            });
          },
        },
      });
    }

    Object.defineProperty(this, "wasm", {
      enumerable: true,
      get: () => this._wasm,
    });

    this.getOutputChannels = (outputData, channelsDecoded, samplesDecoded) => {
      let output = [],
        i = 0;

      while (i < channelsDecoded)
        output.push(
          outputData.slice(
            i * samplesDecoded,
            i++ * samplesDecoded + samplesDecoded
          )
        );

      return output;
    };

    this.allocateTypedArray = (len, TypedArray) => {
      const ptr = this._wasm._malloc(TypedArray.BYTES_PER_ELEMENT * len);
      this._pointers.add(ptr);

      return {
        ptr: ptr,
        len: len,
        buf: new TypedArray(this._wasm.HEAP, ptr, len),
      };
    };

    this.free = () => {
      this._pointers.forEach((ptr) => {
        this._wasm._free(ptr);
      });
      this._pointers.clear();
    };

    this.instantiate = () => {
      const _module = caller._module;
      const _EmscriptenWASM = caller._EmscriptenWASM;
      const _inputSize = caller._inputSize;
      const _outputChannels = caller._outputChannels;
      const _outputChannelSize = caller._outputChannelSize;

      if (_module) WASMAudioDecoderCommon.setModule(_EmscriptenWASM, _module);

      this._wasm = new _EmscriptenWASM(WASMAudioDecoderCommon).instantiate();
      this._pointers = new Set();

      return this._wasm.ready.then(() => {
        caller._input = this.allocateTypedArray(_inputSize, uint8Array);

        // output buffer
        caller._output = this.allocateTypedArray(
          _outputChannels * _outputChannelSize,
          float32Array
        );

        return this;
      });
    };
  }

  class WASMAudioDecoderWorker extends Worker__default["default"] {
    constructor(options, name, Decoder, EmscriptenWASM) {
      if (!WASMAudioDecoderCommon.modules) new WASMAudioDecoderCommon();

      let source = WASMAudioDecoderCommon.modules.get(Decoder);

      if (!source) {
        const webworkerSourceCode =
          "'use strict';" +
          // dependencies need to be manually resolved when stringifying this function
          `(${((_options, _Decoder, _WASMAudioDecoderCommon, _EmscriptenWASM) => {
          // We're in a Web Worker

          // setup Promise that will be resolved once the WebAssembly Module is received
          let decoder,
            moduleResolve,
            modulePromise = new Promise((resolve) => {
              moduleResolve = resolve;
            });

          self.onmessage = ({ data: { id, command, data } }) => {
            let messagePromise = modulePromise,
              messagePayload = { id },
              transferList;

            if (command === "module") {
              Object.defineProperties(_Decoder, {
                WASMAudioDecoderCommon: { value: _WASMAudioDecoderCommon },
                EmscriptenWASM: { value: _EmscriptenWASM },
                module: { value: data },
                isWebWorker: { value: true },
              });

              decoder = new _Decoder(_options);
              moduleResolve();
            } else if (command === "free") {
              decoder.free();
            } else if (command === "ready") {
              messagePromise = messagePromise.then(() => decoder.ready);
            } else if (command === "reset") {
              messagePromise = messagePromise.then(() => decoder.reset());
            } else {
              // "decode":
              // "decodeFrame":
              // "decodeFrames":
              Object.assign(
                messagePayload,
                decoder[command](
                  // detach buffers
                  Array.isArray(data)
                    ? data.map((data) => new Uint8Array(data))
                    : new Uint8Array(data)
                )
              );
              // The "transferList" parameter transfers ownership of channel data to main thread,
              // which avoids copying memory.
              transferList = messagePayload.channelData.map(
                (channel) => channel.buffer
              );
            }

            messagePromise.then(() =>
              self.postMessage(messagePayload, transferList)
            );
          };
        }).toString()})(${JSON.stringify(
          options
        )}, ${Decoder}, ${WASMAudioDecoderCommon}, ${EmscriptenWASM})`;

        const type = "text/javascript";

        try {
          // browser
          source = URL.createObjectURL(new Blob([webworkerSourceCode], { type }));
          WASMAudioDecoderCommon.modules.set(Decoder, source);
        } catch {
          // nodejs
          source = `data:${type};base64,${Buffer.from(
          webworkerSourceCode
        ).toString("base64")}`;
        }
      }

      super(source, { name });

      this._id = Number.MIN_SAFE_INTEGER;
      this._enqueuedOperations = new Map();

      this.onmessage = ({ data }) => {
        const { id, ...rest } = data;
        this._enqueuedOperations.get(id)(rest);
        this._enqueuedOperations.delete(id);
      };

      new EmscriptenWASM(WASMAudioDecoderCommon).getModule().then((compiled) => {
        this._postToDecoder("module", compiled);
      });
    }

    async _postToDecoder(command, data) {
      return new Promise((resolve) => {
        this.postMessage({
          command,
          id: this._id,
          data,
        });

        this._enqueuedOperations.set(this._id++, resolve);
      });
    }

    get ready() {
      return this._postToDecoder("ready");
    }

    async free() {
      await this._postToDecoder("free").finally(() => {
        this.terminate();
      });
    }

    async reset() {
      await this._postToDecoder("reset");
    }
  }

  /* **************************************************
   * This file is auto-generated during the build process.
   * Any edits to this file will be overwritten.
   ****************************************************/

  function EmscriptenWASM(WASMAudioDecoderCommon) {

  function out(text) {
   console.log(text);
  }

  function err(text) {
   console.error(text);
  }

  function ready() {}

  function abort(what) {
   throw what;
  }

  for (var base64ReverseLookup = new Uint8Array(123), i = 25; i >= 0; --i) {
   base64ReverseLookup[48 + i] = 52 + i;
   base64ReverseLookup[65 + i] = i;
   base64ReverseLookup[97 + i] = 26 + i;
  }

  base64ReverseLookup[43] = 62;

  base64ReverseLookup[47] = 63;

  if (!EmscriptenWASM.wasm) Object.defineProperty(EmscriptenWASM, "wasm", {get: () => String.raw`dynEncode00d5aêáºÌXWú}.ÿdDp ç¬I¹@¯Dh94l®²¢= Z!T 1$­ ·nÕ³î&ÀñVY.ØY2=MÜ~eâgªJíXH\ÿ£Ù~CJ=}¸­@	·H;;¤/ñy÷¥¦H"lXÂ ¥#½"ðOô¹ÑHÍ¬dõõÛUÕKÇ+DFôí®nÙÔÍöAð8>TÕk8¶~r¦'7%+lNúDð=}Ç²±v=}Öò!G È¸nÛnÝn_1¥ÁâÈ×^UúÑ._,CùçI°kÐ®è»Ñ§Hí±ãäCP/E\»ZhóPgÆ¡#kÎSàT ¡¡P0[Hu´ÀÞr«´¬~)Ïà/4«î·&üåà^T«¦É{a=}2À¢ÎÿÔÍ?tÄ¨_³Cu¿%zIXÏÕ¦b?p½ûÊÕ¦¢áõ*gT¸¾8ÉF¼k°ÄÈd¥¿Ó0Dyºip($Îg°Ã¼³ÈÀIrÃxÐ¾wâo¦ûB¦Üìô{£V¤°ä¦«;üOÕÊH xà5zPì©@b/oóx²OVòjÒÿ§ *â/kÊéé}Áb çJýKÂ÷k§p)=}¤HÒÆ êI~ýö[©-n)¾~»ëÅÉþÏR×Ù2Û0t?Ãÿ|äy­f{ê=}¾ðêÜëòÝ{OAtaôYîÜÇWjõ¼ýmúTjòi)tvi\Ë´¾=}²
¶ÍÓ}mKÍAÏræ-ÖKHÑ"ÜÏµQ[­ãR¥Ø3Ê«ÂÜ <tzª­g{ÿÄ0t1ÛR±s= Ä4t1ÿ.ïÞ§Ç|7L6¼= ã¢¦ªÈìU3àrËø­òÕOÜUSÖUBÕÙçe{n"¥Aù[5y2¡Ñf<<}-´MIïÏù#OÜ!/ãLë=}ôÃuÙk]¿çê{Áèl¦Ç\?áfs7é²ÆLj®Bd¬ä,ËÐE*E3<ËjÉVíO^%a
}5µ¨¸<}QÖjüý=M¹êD¼¯ Ý[láP0¾¨ÈAdÖ]ÂÞ ½àç è©F¬å0v\2-ÃFÃW°=}é 7çdUL'Åa¤³¸zàê¤H«AWuü½ª¦uL²¸¥½ôKëÐhMéý-"Xg^iÀë8ÜàV=M1Á ¬Vµ¥P»=M<OUóã´mú¹³ÃÀ/Éä$Ó/Áo®tFí®¿·ñ¯\¶«ëóR^{UmÊcZYWø.DÚübM)µ²Çk7äë\H´w /­ú{?MõSMÆx»4 Ry¢2Ñrù´»±Âeë	Ì< U§ÅõíeÑ!ËZhOúx­üüvXgµÿ¾Àê:N=MÇ¸­ÛØßcï¬ìö\[Q­<N§>Êdkû'ÄJ»=}£;J¢¸YÏ..ãühVWk{
¿ê±¸C¢¾Yd=Mä©}4 Jù=}£C|ãòÖ>ÿzØqÉ'¡wÖ²1f_Á~F¨j MG~ÌÌè:¨NºÒº<Þ)R¿ÞÜ­~TÐ._Ï"ÜØCý->)EWýÈºÎaè+»|UºN>C\ót÷@6 «BE:ÔÒÐf²+G¹Î?NáðjÐt?GA^²,zwN+¦ÛWÞoúqÛÆ³2ùQÕcßÄæ>rw0~êó9èíCx·ª8Û¼Öaõù§9ª7>6:=Màkg{,:þL=}Tç¾~íè¤w·"HG±±ñ¼Ã^%Äbñ1>DºÏÑ|ïX*$w%F¼ùk.·®D}ØràS³(¯°MÑ®=MùÍúÌ(ù,=}F·jsTÎÉÅóðç¡¸0Ó£³d]û/}È= ?*?ÌÛ¸W3ñámàß¶Ú¦CV-â{OòW²ß©­oap±Ù;.¦ñ=}®¢ûö\f¯®V¡EtPJAÉ¿kè~fvÄýp».½= Aó L¯¯#±iîÔ´Ñ²Í"ïâÆb7ÐNÙr
¯¤¼º9xIát1{+A
ÉKx·x-eð")O¯u5ë©ÄKHË+k9ùÏÛøX5tT²®qFëcäKýn»#Ãs¤ÊÚVeÞ÷áqi÷BÙøUðV	
g"÷;î^afÒ03,ôôÜÜàbÃÆJ½ÿkÞiÇXµ¦?1ù¿cé÷Ö$û³´bËW°HÿÄ£9§EößBCi¯Q×",âØpó_sÒ×©ïßÞPD§aWf§AY¤³sh?º9÷K÷;2X¦¯áä¥[%§)áÓÆ= ó'<Á¡ug0Ú	HäQß=}|åæèÞðTÛ½®-xµ¥Á(jñ#<Â²@húdjäÿö¼ò%uµe¡Ã¬·8Kì§C¶3ev FÉRßý¬£Yhõ«¦z ³µÈÊ«¼àÐ­¶0§°;I=}à6NñAW»Úr¥3G=MÂµE 'ÚNªzkpµ(/ZkÒ%y*ú*ÈyÿNÊpJ÷>Ú 0ÑQ ¨Eäk1ÌÂ:d¬¦ù§ù-s©æÊãN7!<E}f9âÆï ·/ÐWWì£nl$ Z(ÓÃ|K= Gºlêäá,Ödns±anIk´:ÔÔ[m9=}#ÏÆÂm jáeøü;°ö¬è9ädxëß^KYQÞû¦&!¹ %ÒL0¹u^§W~w#ÙÃ|#ý2¹ûf?/ÜçâÐø¼R6
nA×ÒÍØðgs±Él÷zÑ79ón¤æ:L-¸O}tËjT&A¹5é[$ \Î òáûè,¼íßÅ=MKù~Pèò­¸ù?BíÍN¼GÓ«kD À9n®£W´r4Á[ó<î»¢²lnnîóÈ4n£­´x¿,~'z4
9Z¥ULömË±þ]d
±×8O6d}à§$EdFÞ¥§Âloiàk×ýßc=}ÛÔxyCÍk@cI¤?=MnbÔç³qY²Jà36ü1ÏÐ£îÞ /}(=}½^w³Ã6ÿ'x÷µênwê~±BMwi(ï5²¥øgéº:$»xª°ô2/¯S®Ú4,@.î²sÏÀhÌÔÔnqOKÓÃPÄÒÈ1÷±tÀ[@¯|XR'
Oý¶f¯<¼TÏWôSàdÑÐPT2úlßêôÈêìZò|[Àj¸ôÑÓ­ÓÒ´yß(	
(ØÐnÍ÷³Écï:TÌÔ¼Æ4¡á@ÓV|õÆâQöáòðR¤ª¼ÍVÍdÒSâu'±%îú,7LÞ?6Í?qTe÷´VI=M¡CôZò}!)Â4ßÎº´uæºtú4÷¡= ­Tº<¦«¾~´KSÚêÅ¦èæYë*óµ2n¸ø,øÑ¬úJ¸¶ûÀ"ÇY)3uº= Õâ¾Ág,ì= òùoôæÁg?oþ´ï~í;õêÞòºMk0·nfbØÌqîßCÜ#>S8þ¹îÄSèô®oÍÌ_|Ç	IÉÎìû\¥éJ>H°·¾É­§8 ¹©UþåZ#Ë@P³P3WãwÅ>ÞûB¨iwÒ|wÊ0OÊB|üÍKëþ³ÚßÊ½§¿1Ïe'Ñö¢Í§p«ÊÞ%?¦Ã;;q}×V\¾'qY'CQß¯výüàwRçÓ%í¢ßÃÚÁvfÑ~¸XØÕÃX¾pé£ëË¶4g°s*:þ}ÇZXÿ9~@%J)ñ)kÛÛªÕ O%>kkäºó)./}«>%B7>°u¯'N%j.ïï)/Wò¦%¥Ñ-ïæâ¶ÆÚ®¯P­ÎCÛ%í)¨òôÓsk>øò0ºÜqk¹Kö.'&¹Bì³ý¢³M]ÆÄXäàYßC%6ô,ÃEF=Mî¨°i9*.OD1~ux¸?ÿ¡ù[óbHãÍV5¥.¿=MJË®XrÃm(3&@ÜÐ±¯ø Zäl.[i$áÐç÷ì21Y1¹6ñû¢ç~mØ",©P1Îäîò:
Îjôïô·ýÚL	ÂI!§)¹÷¹÷ Ú¢»¬¹8®q¬zÉ|²·Zøé2&oÝêbèñ¢#ú ,Á÷]ôå2Ì¾ê'2µaC+DP²ÿ'M6ËF%= F)¼äcÑVÌ]Ö[éÓà5(â'saV£ÙlWÈúËý½§þ¼Â\ØàÃ[É(àÄV=}f3­×B£zðªIÜ¦Êãúsçôø½ÉàNÃ)=}/òõAT¡7Ãõ¦u=M¦E6ù¾çIû¦¥õªµ'ã/uì?6wöY9Ê#Gè¼%Å3Þk!aû LÙ¦õðTn¸À³KQr);û=MÀ¥µÃ3Ì­2Ìh^áutõç¨¼OAÏ®,ÂHpî<ZÛ¬©ËkA±ãèí¸ôï²KÓ1ÍgîÎ	Ôf.lAÁe«} fù-g­+ªñÜ/v®ìr9}'}vÿb,jDpªUø);Xÿîù=MeÙ[¦$¢]ñ(ÿ8v''U«ÝuÈzô(?;õßàù#zs¬qS­²ÞÀWê	qçRéÂêiâôzkU:á÷?ynsqe³)h;£)ÉE´A²ÍJ)S-O¨±¼sTã]¹¸C¿äÀzµôBRÊÀD1ÇëÌÒÑú´òÐEâ\oÄO ÎÃ£w»2´CPÁÓ4ãÈ	·T¾²kòéz9AË¸#]ñ0ÐöÂ_K]r l¡§øDÖÌ/MÎ'Õx×=Mìå®ß{õÄ×§Ôzë:Lþ<ö:óNÕ±k^L7Ö2ûÛáÒÄnv´ôîã4b+3EÛpØÛÚÞCßÒ¸¯j8õ¢TÛ>#ûoMYÒ'}YíHMcÊ^¡î#^Åöþ	BkhÖe·æqö§ðÅ·yêõ6«$Ãpù½³ùKfW?Ñ´
îï = 78Ôéu"Øìñzô*vJ®ÃÞ«§í×éiÙhntmÉ|>æ4 ÅÎXµÒ§Îwfl,tÔl¨§O§Sß~tQh	iÕ¬ß>M£³ ©N)Ìr4ÿÏûª/Z²Òbûq\Ð©ÞF=}C´6GÖî<ÈO±ÄâÀxPbë÷W·]íæÝ6o·fÙñÌM#K½%ÅV±Më-!V_ö¨îp).b/ÿn­9 ¡½û]_Êû]"{¯(±¹8hªa?è'5Û7¨&+o¦w¾ww ^¢§ÿg'^	)¹"DA_:êo
 }Å"4AÏ ÿ _]ëxu8²~H.*UÊ¾¾ ô/ý{ö¹õ¤×?u°ò¥2+°ñe¬6A}«Ø-yÜI,A×5:ñul½óÜÉjªUØOÊ­Ø ÕÂè?.ºBÂòJBnRàdD;6r:6ZRà Â.-:96ÒßàvÒÖàØË1ë«=}zìÀaÒy(";«u=  I\ËaÊ¡oe)ªSff³.ÀÊ'Ð&ÛÇ;~#ÀÓ­SXÖ@Õ+ÂLí];¢ø¸­Aa"£åÈæï£¦sïf8¨Ø%ªÝî«0ºE²°ïÐõºï£	xM«m­Aª³/JEk»)>|é_«>(
úÉkM:
hzßkØhqpZÿÓî¡[#¾c-ì{x_j¬5ÜÃ\3ïx¬%\Í<60¥Ö¿§*¶a-DÔ!AÇéÀ*½æ2qÇýØ½Z¦nåµ2u6V¶-p+-ÿ@¤_íJ?_ÏfO>*äuDÒ*¨ô®?²xf6ÜUà*è=}P6l¨ÂÕGFª%^Äþyý¥ìøº%_S¦wÀffCKAÞà1«*Jßô³ò·x{cßOHê4dÃÅ3küå@(ÅvI¢à±ºWI&e)Åû5Mç¬¹ãÑ2ñ8Ü¥ JïT8$;®#ø²HrÇ)ývË6dLiûùIGºx6°U¶-Ö(-í©ß2gÙ±G.îÊ#ðXg\ØûùÄ¹= êYjò+ûAæ/ëJî|òxÈ¹N}¾ÎÞ%È<rlN&"¤Åùò ­55ÑÝrÆQöNó>OSáéTs<´NÆ= AOóÖ[ü6Ú¬Àb9!D¦& t4"s "¤v]NsZÈ÷7ò)F%ZñLÙ2Ã¥ñ|e|éI×¹(&YBïÔX5ÎNËRT/"ùç24	SÍ©úW]ìÈcÞÿÉ9 ÜBî:
0¶G~½;Ou'>:FÜjYe^G íA:¥ÝCÙ<ÖWF±o®Ü·F\ È|ÇÞ Vm,:4Æs|.é:Ø<!C¥ðròóùøÉ[ò)âó|2ò7E6ø&VOÐßwãÂpÒ7aÏÎÜæN9ØNúBÐPrqaé²Ô7?G· 4U°¬Nws¥Òol+dI6~Ù­È²s8Ø8ÔÄDòÄ¬H
ÏÞx3²ôÔsXB´Óè¿H lLÄ¿Óª&¤R¦Ã0\À	<H£7ËóÒ!âTÑ²9©ÇÀ¿x|mT¹ 7á)ûTÎ(a¹øy![Ìj¼Tºµ×QßC¢ìf¼arvç£©!|©yÀËÊYª	âzC´!ßyk¡£Q¹³8l"/ä X¬ä¾±©½È|»¿t{¬iâÃ-ÁÚ¨ÓiY¿ DiËÍyfXù>&ôÛ Ûª4S Æl©rk¸¡±È°Í,í:júX$Ó¯îí^5^QÆY\ËçCVQ.ôZbÆ/náÐPèEcÀD´°Ì¬äMÕôÅâ.eÆã"&çBuö×Ùì@ÌsóÄÌ¦cmÕó9(ãhd^íg«tõú©=M¹QÑ9.wè/ñó;W=}üèÈNXDÉÔT#J´ìäµRÛÍ³Â/$r*J?¼©¸ö@ÇÏ_ò	ð¬þlt	9èäNó;ÊóNÁ¶ñw+Òh¯ñ6+ÁµjZóÈBäxcùHÁP÷ÉOVÂ~5I¬Kgn»B!Bù°[îPÞuïpöèýÐàAzN cÿÁtè'±gâVO¹+ÆâçËÑ<¢öAÖaL;ægÏmÀ3"«gÏ]  ^b>ïâÍÓm^	PÒq9Up>¸L¨+ÅíâÙlà¿$åí.Àþ#B @±¬Pµðª+Q+QüÿÓ¢6nDbÄÂðÂ(·;rC&u²Ëìæ=}4ÔÝ÷Sàí·)*Küä@~B±Ñãnh4<ÄÐñðJ§(NT@y/\oæ$Ö ~ñ°m*OºOCY9ÀÝ½¡¶áYmÿI5=}®Ð³A39ôf¿Y"©0¾?= \kR=MØQÔpbAm#ÙâÀQfRüFÁa£+æ8¬¿*ÿK Þäè®õÈqÆS<JÀÿðjÃãÈE§ëÿÃ*¡màÆq=}Wi'V¿wÍÿKJÏÅô´ÏfüxºUZò¬PªT?öÍ´è·Fy:
¹rïGCí'jÓåÌeþ{ô1îü\Ök}ïês7ãÍõZè1J-wCG;Ï¸ZÛS·gqögs¦T#|s;±Ìæ¹(©½ñNø¾Å±È	 ÿCgÛ>¯öäwrÓ©}Ôê¬RæBÐ2*'tÔÊ=}1{ñ÷Í]Üè¨Í<É¹m,È¸Ï]&^Ì¾ÍOXÃÒ5ª¸Ò4$Ð}øºÅRnvu¼eõ|uDç+õÇ4Ö®M SÔDÙ¤xÀ"%zÙÄÙeLâMf³åÅrX?ô¨î¨^Öí5¼¾=}AdÈ´¡ÍX6sÐ¾?É=MEØzM»d) 2ÌF.o¡:ÑóÃàÎ,îãÑ
giwÐ|ï®Â¨®ÕÈåØàCÇ[à{û¸$ÔèUÚ÷B3gÚðµÔ»â@´¡x^&RD£M½À±ÿ6óÏö¶|ÒSaf|ÀÌÇXxæW«
½ïYUÐú¤R/MmÐ¼&ÆSôÏOÉ>RûlÞP¶óqÀêsRª¿î1>åï8{7GÌÎ
×ûàíXÏhÈÐc@%;Q yÄI>½ÒÝ$vW÷Ò7Êýüî¬Nä-õOü©¤à
m]pÐkè¡üeHÔ"(}c=}.;:!KÄ æ,Ë[tÌ;aÏ"BT¼:&½aE
¦xôüÀcÚ»³cÉ9= h×=MrÌSc1°÷ÊVµÿäsrýØÔT"xnü¡^Ýl&VævÎöÕÅ;Í3ØàÛ2ùåòÇòÇ²Û¯×ï6xUqêÔåî=}NÍ.²:A Òõ´_XOt(Î£ ËÑd¼BQQ =MysDãQ	ÜÞäQTøq+ÆÑ¹TÓVÔ½ìÌ
@¤p3³W³¹j£ã¤LÓ°¸ÒSÏÉOº3¡zxÒdÔÎLké.D@Ã1¿ÄùöTW¡([M#ÖQÙ=}ÖÙ¤öò°WËRìîÒéiRl[§æ $ûôQò>¹$Q¼doªßcx­YÅmTóGÖR¡CQü¶Êç®?¹ÆLÐG~Ó¥Z_Êô¹¹çU,)iÁÆÿ§<Êî{É¦òK°ÆÚ§yÓôy¤Rü«þÈ{3{[s$É?d ªGa2£§ ÷»·Bu¾µ &c4õ8ßÚxa*kñ¡R.×¼ÛWËÞ¨<½¬4ñ®=MtóWÏO_0CÌÇî]A0Ç=}*Z±Y¢îe. s°,ØÉ(~ÑMñ°
KiUÂÀã¨rûÃIoä+FhÅ¸Ü¸UÁª=}3= ad.¤ù©)Ò-A= nR|´îqÓ¡¾ k&ÇÕ:ÃXÄ?KËU9l÷QÏ*µbp4¤ËÈøtÏ¢V«bÝ[PCáýÊÊÁIf>ÇìKwN
×f:vñ-s°ÌøËªæø÷.AÉÑZ©F.ýÊº=}¹¸ñÖ­±BÈÅ[ÒDoYI±(é³M=}HÛn¢°oã%rÖÆºS±}Õ	n/½úJ¾âEðK)¨%ÿ5ô®½¾L_Ù õ)(°-þë²bIt´£õÉ6®/îüÒeö6[ù954ïWøÙ=MqOh	©ðïlK±ûyäqS¨1Ó4ÄØP¹!Aå(5µ°¸vÓó¬	QGzMºuTã= $Ó= j$ftM-»])Ëm=}0*>(ÌCû:$ÜÁ)bø _åqðêdÔò ºE¸{}¤RäP'	ë¬>Ý¡ðc= .m*-Aó°ßsajÓën^³þ©bç¡èDØ		ÔOt(cRw Ùt6W¶¶ñË
¡©D¦Xi§¤}íìy^é5½J8g´§³$üÉÀBvL2zU7y'CIEªí9ï®4]vX(tÒiÞÐCêW­oMe(=}Ð%«&_¢ïHÎ- @GïµþêY·umå±Ù/iÅ°cú/iV=}}¦ö~}&ÒñýÏÅA%±:wà~Sò¤Fúß®%Ù
G"÷uW_;/rJV),ÝC*YÍö×ðtÝ^osiédùîw*ç"HS<jVIº~û>p+#ð£þÞ5*#°G¯û>Fb<:ÁZG¯á9ï:õ7uA|ëÌ ñ2!î}ÿ~È8]FlÔþë[ÖüËj8zófÿÆ"múÈ1Ûº'NßÃíB rûEaz¬ü]t[+Éö"ÄmªfokY/ïP.l %+û×7¯õ«ÕVµÝóÜWEöØ²ÛÙLâ²Ùõ*WüùBÝ#áiµå±?,djÙ$iµq2¬¥|$#ÑÝöý¢fwë<ÐÚÈÄWqÀQcÇBàÌ>9àâìà&]ùK ábã=MS1EæRB³jZmfU{vxn3ßlî´ãEkE9y4 «ÂNÓ~õ¨+ð þÞ
øvÛ-ËµñifQ©f;owÐ
ÑÄðRyAÖ Dör=}= ã*QÇb«¥íØÇÑpå0ðGÕ%0 ;2Fã£ø%Þè¦ò¨b®¥¥¸©¸àÆÉpò%ïçÒ<¼BDBà\£/:°òêËNDüs¶ZÏÁx.ÂÊÓ¯ÀXPR6ôB¶'?AxËÏ}¦34­Pð&õÄtdMÑ¿yØ =}&¡¢b)Rh4È1áÑ,\fúrÆÎðvjÛ& , iÈÁhñÇP£ÿØ¥8ÕéÐNÎp´X2lUÊ¼ÎR¡w¸ß{dÒÇT½Lø´uò²(Bs}s°èú<¡J ×]Ü­w7]eÐæg$þèrÅ(gýã¦-§ÒwU2ö³°e»3»=}È@ÍhÌõÄ®= ¹pÌÁZNô³Jè?¬¢Ôm¹5#)~9|³T¦mì)Y1À{/åý)<%B8³&¾ÔÍÆ{(äA³r=}ÖâÌ¾-#çomØïªû3BÞýrçic¸­É,Sâÿ{= ©dS­>@m' áËÝN%àÉ£Ð×~éÄÈ%®{Ì0ÅàO+Mc>= hS°FÝõ
ÜM»®=MrÉ¹ìpUÂS¨¿ÿoàUÔ+IËªÅ:ïÕýìÒ+Têßì9%ð×¬çÞû{#ÔçBæ)ÑñÇøOÐøOî¦±®{¸ªªïÑC?Áç1ËÕÛ%A³DfëZ.;5ç ùSÆM:~@]ñáÚå»¼ÙµãÑ§¹ðÎÙÌë"Slm£¦ÝÖ?F×±ÿ:ÛøÙâühV"b&¿ä= £½»W+õ3Íø¤£ëQ::}Mw	* ¼¿Ôé/\OIcN~Çiât}+è-Pï#5âÞ iàÓïÛ¸·¬Q8syâ'ªZ­â»¦
 e_·ßõ£øÖF!À²6aÞªyÆþªúèyãÑWÜëñðÚèNÁ(.Ú7'Z?-á¾Ìñü©XòEuyv ·Gð{­0½rç%âÌïÖµV-ièF0ªþr|º@&?Áò/=M3îDSªVËZö¢-·)"J¤m^^ä'¿T¹&¢º­¿¾ø"tR¡É§ñÿµOÕ½ÏuRRy<L#ä¢6d$QÚ<OºçÒé¢ÊQ®ÈaÆ":â2Ó²ßv	= tÜRTßüz/³q]P dóXõ½îë´#î<Ó¥_e ìõ5þ,'Uzûè}8¿ßÈQØúvCæÂÚ¦óöY "MëG!£¨Þ·ãZ»âeÀføÎ xpÂß&¾À&a¥	Ú0>Èþ{°öµzã.ÝG§ò[ÉßwgtÎîØ$
åë"¹ÅÏ»]ñÿüÿ=}+}TfÓáSÿÜâíåÌõzÏåi=}ÜX÷ÛÂ=}OØ= )«@:R}AÒÚþñ©î ,ú½ñn§7ú2
áJ¡ö¼.Ö|Þ"iÙ©¥¼o5=M>~ y±ùef¯
*·ýürØ£_V·l'´2eûï->ZÿkEZÏm7×ì×°Mâ®zCgÁßµ)_F]reÓ*®NXML³êÆ³u3j®0æBã÷w#¶-~HT2Çs¾>erØO3~&~ê]p}¬>)w&Pæj	&\
>)[ý¬Rtïà&FèÊ¢ï:
?Þ&^Ï|ï:	¿ûnû¿ë^¯ºS¦À(Q,6½®"¡@Ø-b/9^"©¦Ua²p}ê	?¯
&LZ_@©ß>§ÒÒb¯&Øf¾¡î¡»5
­ë¹¤Ú9kâ4oÒÊû¤´<8H±=}udK¼C¤NOaRÈìº1+Ë¢Çè¥|Ãó¾òt#ñö#K©ÁDGLÛÂZÅÆW nèÄ¡øÓjß(ÊÑ]A7dñÚÁQrIÌò~Ìã§Ù ÕbG5i¸ÛÚ é½;ßìë=}|ßA=}Ë@Äó½V±fó&jÖc<cCóûwc=}iu]@-Jmcê[øñó¿ón¯'Ã_Úc!ýBz÷g·[)¹jðM|tvóþÂç¦~2Äì?-¢
ÝUó¹5÷Ù¾F)¼2OEë¶<ªÑãóéé.÷üAn=}Ò×­Õ&E¿Ú=MqôDÚ Òù]Ø¹Õkµ.ÞO%¿{*õ¢VàâÖéÈPao =}w<:FPÚ$R*íàiu/Ç¦´Ö¦at^@iG!RµPMáÔvR?æÜ±iØ»Æ'<55²?üm%2rÙb¬.é£"}õõ+È47:9¢Õ)ÉFéêYÓAÂ}\ùõ= X­Ì^*:ùòùÝò´u²YýnÑ;Î¶ËQ0õÃO\6ôîqÙ;Õ?ðz"HöÞ¿.né0´ìÙÂøªNº6ü[®k¥¿M;Þ)¢]&3bmÑZæÚ'&k3÷ÏRù!_¼nR,hÒ¨\«]«:Ñî+¾wM+eüÏ.
Ñ-c>í½êãàTïc:/ÄþÐ]_ÊæÊ¶Ùøbï[CÁìù 6wñóGÍá¿cXOa5ò¶#Û	·]ä%ÁFãÞyþiÄa¥ùÔ3¯÷ØXm?¶¶ºX=}0ôÏEþ>ü7ï÷ªMoÅ'ÛPEüvmô57¸IÆ=}6=M;m	cáÊ®É_ò 0£¥ÇW§Ô7®zÊ½rË1AV7È¦GCeB6,îBÓZmyÕ
Y6Ì¾ ÊÐ©<bóT iMbd­³ô¥öújyxÞ&ôRàè«|ã|¯ÅÎ9DzaÃPta,QÓ3gÔ)k-VâºI°Ék<õ>þ)°ß6¨"ñíøxc7§è}ÔÛFúx¸Ï5pGIÊH»0	½eñG´Ð;5wÂ×kÎªVÛ÷±ÔXû	bÇÆB=}É8\}EÂDÝíwG§OüøWb5D55gÂÓmÏ=}m_ûÙyj¼Ê´[*!ØeÙº3,(ù©Å
øøh¿¼Ê½²NÈð5D!¡Àm5Dºaý¼=}âi(ÛñÝiQhjG8B5ýstH%HýP,ÀBÎF¶É!Swí¼ª§6ÏìÎ¸+ômÒ#EÂvk)Ü¥ 6isL(éÄ-#N_BÂÊù/ß@Î¬Â¼uq¼tB¼áÔCv#Ñ|Áfq%´ó^ºaÆm[ s:[@×qCé?Sg= îñ«Eqæù|÷ÑÃø£ñ¬TÇ<+T~Ô<±ÿIõë]õò«ý÷¤ê¦uì$¶4EÍò±'ÝãÔÛü2±QåÜe?XFÒÁð#½ÉÂ´Ó|;Z³gN
p«>!GêX¦ CJùØ¾+Ó9Aò*]|HDÑRAIr®/qû:¾'ÉG	ÉÃ*?ÚGx¼%¾r	ö@>ÉoÈúÊÀÄÝÇXM¬ll¸$ÂüTám ZB²ÔÏøAOá¯OÅßÊý£Ûüdô­P×æ,ßÈcfËÔ¸"DÑÑ|ÆÄ&¸üíÑGv¾å8+Ññû1 lÈÒÙl  KÃù¹¦(N>»aØUaîr¥­c¼§-À7ü·lÇ£¬oµÍðñ7ôÈÔ!!{(¡öz J6]7r¢p«ípæ8AÚ^z'3g5#û½Èûõèú_!ýn~òÃ³+|?â,ÁÑÛã¶&Îì³QhmEÈB¢BD¶¯°ÄçÎ#¯pDðC¶«KXpÄIÏ»°1MÈ²íDØoì±Q|OÈ¢ÿ7¢­y»{0HZßÏSd¬ºöTdW×)WÝµØJ´8ºÒ:ýì º·bþ- ­âý¼Ó'iHVG}È	°yJ»¯"[ÇéTÀ²¡ÚöªébÃMÇuFÌ·ðÇN9$ë(Ú£ôIÂ,ÅÙa_wBc×bO^µmÿ\®BÎö¹@
8jp]±ÛG©}ã9:Äuh¦Éu´ój~ÉÝ"ðø NÓY^¸¸káÌYúOæµ»þjÑíª×]é©Ô}ÝZÎ±Q¦ê"Åä±3ðÑ0Îd _}Ff;è©ÂýÊî	Å9<àT¨²Ö+Â£!~²®d*¾a¯2ï)ÃÇÑÔ,Ì*@Òh»8%8è+p;{ØV_¡¿¬ãl¤¨ýÃð> v½!­ªEÌ{^Sý4ùÐ¹L]¨ºÆÑâÁ
Y
?USªøõ´ñi6w·ôvÅ¤nõ?ç5ÿ((RØfiýmReOQ4~){·o¯RõÏûç6²»LôC!,Qôµ·ÎVÕº6q³fËð~éâ**ÕµEþ-ÊÇ­WbÉÉö;K28S»;Ùç8éÚVù_5<Í!w
áIçï{QÔ¤öhÀ©Ô¾TÔwvîEàýI öØÏ¼sR¸¨0°¹£Fj6î¹Ó»5Æ
¡KoPÙ)2sPBç¥é7= Ú Â÷î°Æ= ¯üÕqZÑî=Mu+Ëjq|èáiTGD éS0Ù÷5z©éXú9íc= Üß¹N±]I!4þA÷ª%òÑZ®92(Õ~¡Ü.üÜ\^?+AoþR(ýr®O¡¼abhû,§¢Ò#(Báéø1BÁ?HzµÑDr±ï©/BBø¯¯{ª«wRxÒòª}tØÆÀc{$á¦ÿ£mÈõa!Í[èç5&ÌýäôLà+zÈÓ®Þ&âàÊð½I8XÇw%òòÝÑ¸ÔË¢tb½x5·qÊ7åE³öÿ·¤pYõ= PÁAª±ÀOºf>+üW.ð¥= óe³èà&jGwóÁ}+gq©ÄCüK=MüfX×"û(ÀK¦=}¾­|[u¸-·í¶-[D:vîûNÝ?Pø$/JwiXS¼ù¢âòªJ*#þ?C5(Ë´¸kç¢ð8ÑÈXÿqÁU:{2'¢NfÐe²KjËà»ïgT£q$j áVC{ý4ÂëÂïÿ¤53/Ü .>['¯µñïi±j~¥ÒÞ´ð\hòZ6ºÄÚxV(óÌ­7|ý­· jnÜÿùå$Êò¯@ÿn&ÜfGe"Ì§/V¶×0Þ£Âí¨r6X,ÿØê>õÑáÒÉmiÊ¬'ÈÓ½yÂ¯:üloÈ&áGèº´@Ââ¢sÏÙ=}?¼B¸ÀHøRÂ£Í´P&ÑÍd?ÀaQ£"þDüV¢¢qÒx´ä÷V¯&3}<~]1ÌÀÚDïÒO?å,ã1rÁ-&¯[¨=}ÇFãÐE«s24Í=M·ÿÛ*åæcC*K¥!<uz¨VDöòp·lpÓ¢½eU¦iÔèæ{pg.b{Ñê*zÂr)ø u.VpZZ:Dóìÿìï\f¯bÒcÆûëmX3ÞëMÓD²IÇx@ß(gÁ·	²·¸É¦¸7uÈnB×Ü)Î¾5«(*Å-=}!ý}!0¤1-8{R)	9b¥Ä·í/õ!lí²?ªÌzi©f ·®|æoùb]Å½7[¦¦ì5
ÓR½æI±¤Hïeúæ@ÊÊè#aÞ·ö84Ê£®Í9.-&|5¨|³»u>>pQãã?$= @Þü"EÚsÍê5Þ4¶HÅÍÄÜ=MøWÃ7@ê(²Ó#ô ²¥ ÿx¬Xð,ØwÊNN"¥>¿¸D hï´~I<,ZrGâJ<@¾m5ÆÇÂ¢Jx~t,;"-è<±é°ÊwÂ¦= ÂqýW.ã7²l¶5øs­N1þ¤¦[û;¢ºõ/5µÊ;_TOÑMÎªó!ç-Ò#1Û8¹ã=MPó6{p?WnÂ5;Ø;X.jþCÍzj.ýËyû¿+þsq«Ía[6AúTÊ=}	¡êÏZêÊÛUºÁKqáJýì4d3£Aè(cÊ¬}¢6xüJJ	Ä-Ë¬]¯FM©¶Y¼&Ä
]fÏ»z&8Â¼ýcÉª{K1/³+nÇÔ#*SËîÛÏå»ýòÐ5îÚÐq´EBìIÁ*ÊxªlöÓMýÔÂ,8r= 1	o¥.^¹ß>y¹Ê¦ö!Üýå·Éócvp#Å@"WgUiÍ-ÿà£¾·Nc"U5|8´ª¬8$ îWp¼zOoûEæ«øHLÑÓWÎ/Óu1?éÐfÔ¿·ªIÓ¢akqRÊf?Z¶wÚZÉs¶7Ò¶<Ô jU ¨S´ËÎ¤ÉÉèÆçÃÏÒi?MA»©¾òxaI/Ô+Y^þè7X,Â´ß±ÑâÅäÔÊÍãÃQ4]DVÄóÑÂ¤4?|Ëª'BN©Xä$#SÂ|JXË	WPÎÇ2þ$xwdUÄq-¬@f(@³ÿ3ç-µò¶­of©Ä®3^ÉWØXýú«lâäæ&âÀÁ+2}¡	E£n=Mc­Dªa-)ßó
Ø±'ÅTö)Ì¥§t¾i=MÅî ¬EaÓ¥nWbñ£.ÐK¹Ìl!b= åcmº^.hX=}¬Ñ39DZ+Ìjé³Ã¥ýû\½iV~Ùb4¡ihl0(a>9OFRò£SÀ½çå5'ö-2¥2ñÞ~1èEý©ì«þ'
SéºÀåÃX¼c:Ð²ºJYôÏéRn¸ñ@Ó³Ã}8Nöâ6ý¯²¸Ê'¿"ä|¼ÛSd4>Do£Ñ÷º,däÆ%Im4ÂÆëÃ?ZÞí'MÀÒà= æÒ.ÎS½.qA<»Æ¬¸*hë¨)¨7Ë?%nU×ßêÙ[üsp¸ºCv²	¬;rÝ ¬q¯¼þõ3ñq¡±Ì¹¾új5ÒL-ù×´33¤¤Ì',¥Rú+¿kØ ²jØ®X§¶=M=M FÕ13ZmB¢[&àZû.;­xî}«ã£D]«ÀéT+ÑJSt05TÙÙü²J¹Lßfé¯}ê~&UJ®ý>NÿV-×-ÅØ@¶ÇÊÞÄÁ&­.ð¼S¸Âþ}Öùm0=}¸L©DÅÝÛ3¥Ó:vð/K§ÓÁ^7u#DMA, æ&ã=}Ñæ­dk¶6YàNÇ/ÃãÒaVUTß7Æ§ïü^ªøüãMåäL÷D=} ¸ÔxSºðk&Ò0iªbùâ²ðl¬Ê7£*}ðÐ[
¯8Ge¤du\£{uµP:Ø.¤°Hò<BI 3v-Ä:ÍNpl HÇäÑU°~}-w¹&ÂäôVFrFFçûÌMÃaêm§))7GáQ¡ßQI]]DGñ]Õ=M2¼ZÍ=}Ð¯{ÜY!ùù¿uø+z>Ô(þÕêGtªJgz/&)äKo% Ç3\ô3þÉ½Ij~#N¨þ¤	rÇA½iBl¦Î-X§îK®M«þúÔ4ä¶ÙQK¨1=MG¿ÚÆçøN<ÁºìòR¹´FÌt÷& øIqò¸¿Úº,F?_J[ijUö<K¨H%	ìNn:6ïû± =MäYaGJÝ1ÓO}rQ%8'×X®2W=}"ã*ë|,ôæi¶ÛTs>MÆ!ñü4GÉ»ÒÈé]þÑÕ Wÿ<¾í&ËýpL¦¾XfÂªT·(o,e?¶ý³ýl÷ó»Ü§L®(\Mt¤D·EÚ5ÊáÉ¦4¼l«ÒsÌ'T[ÛàZh4¬R\Ii"a¬6;ïzYóo= Lÿóy=}Ô´v¤}Þ¯bÊúS	»*8Zt=}Úî}±¼¾ãåR
 Ê
Lßjkdhÿq®rô6ýúp·/ª'Úùî°IÎ[JmÕ\YZtÑVnNÊaâHªqçr§èr§<¸ÚÃ¬×J£M¢!^Ìp^|!ýÆÓâmW??^|;nIV8V= õÈ7r= KPz¶Û8
O:©C-Ì{C ®ïgGþjXzjÈë2£M_
Ä= Ñ©à·h<+)dBàâ¢ÛÞÈEëoYqÀ.l8ÓÎë2 VýEpãÈ#]y¡o#¾ *º]o|Fl; zâ¯õHSW¡U¡¢ò9£Û9#±ºlÊ>Ä¨ÓÀÞRÅ1Ü Wzèá ÖÅAÜù´¦P@ÜJ°¥#=}:uêL½F°jAÜò Kð¼ô ¾ûyeürQ=}Á.=MSúä©õÀ(äÒ¿ÿPBlQª±äi=Mð[8l	õ)M{ïÍôá3_"ÆOðÄÑþEe? \c)CDêÒÞÃNu^y+RFì.*­Lyò%_>B 
Èæ6Èè7-{ÿàU´NñYpºý7Õäà¸ÔÈäÍ((®ÖW¸§KªxÖiø³*$ Ì
E
3³Rµâù¤@ÊZ²mpY1|ÉÒ\³RÑùíù{Ø¯FíbÞÓÄvùØaZYÿ0\&êø=M~É7RÊÿï_Jì®¾ewY·Ûð=}øi*Ñ´å@q¼Z!2ïÎ)NCÌ"=}{>àè¿NÒ¯ÕóÁ¹6u$±[¸Uºý¿ëy²7ý$Z9Ê¡®qeò=} 4öECí·îµù©(9RÄ ©ð(á_>Î²ÂÁl³ÓTð-¿ù±È^$ðCgÏVâB½£úºÃãæ  6ÑtöñëöX26vÕÚï#À>ò F7Ø\ÛlÚjþÎü= Ê7o¤Èïtê0ÉSaÓ5ÉN;ea&ÄdjHÊoÌFv*Ëu'AoÁ÷¢àyól¬72ºIílX£YpûøP=M×ºù¬ä*a2Ùû¸Hµ~¨Ä1=}$ nn¯/ÑqÆHõ(!o	ÊSzMZçEdyQöðNßÙýÖ#å¡übí¯5¡ËL¨üªÃ;dU¼ñH¥ ö¼òH¢	1PNÂûñö¨2bç;ÔÎ|S]e®sÇ'Ûë!ìªR1ÌuQÙðyÑ-ßCcÛùÁ11Ãã¤­Ñ ¢¤þ5¤Û5<1Ü­.Lö#Uö<Î
W³Ù³÷{¦ß$J6³Ö¡(ßhb}Õ;e/Ä×MAØÕÀÕ0Gp°1g£O4kg$8gÍ¡^|Àá×ßKF½ô!2a]n¹ú+LKØI_£1= Â©§#ÏìÏÎGëÀ,ë&3é
ËÞ6Ìy-ý=}Ëé]É= Æ= ©"Í¸µë>e§Ö÷.FÚ®msÀJÔGjïÚé¿£%¶N»à8HÍñÇø-qI}­~³=  j¤*Hz0jìI ¾Rò6­ Ã§y3ÁàÒcð7DMÛ4D,¼lxÇÒåiLBÁàM{P¦ V;ìwjò¯nÁ¢ë#:×YO'ÃRQø6Âvd+IÙõàíC*t2¼Ø5°/<Ë¾ÀzáÀ/HÅ;Çg êrã·À¨®\¥ýÑI´åÐ,T[Ï>°/æÈ¿´"¢Ö_CYk m'ð~ñâà¡m¶0ãã¿! íõ¦»Æ¿&ñ»ûÓB¾0µzÃ/ÒÛ ªmÚ3îP´±x)S¸¼È*i6óU§ÏTµ "<¤¹à²9UÉ«iÄægÝ\rªÔ2áÉçË·u³?Ãú¦ \;TäLZn(}XxÎÕ$ã?Ëi#1·wH÷÷_¬UIÆ i&2ÿródÜþ+EÁ&÷lP~éxðÂ)s­Åàç.ÿ!dAæ3ßç1S>Ë¶P#4v!½K9¨²òÊê4èBEéZ w ÷?ÓP Ã8À·+:½f¢ºx	þPÚ®³Ê&jÿCðl¾;´ø(<O>ÀV	Ù°µ*§úö!ÂùÔ/$ouÀ8\%Eè¸þH0n3J×tW[9ìºóêZ¾è¥¿ÕìEdk&ã«l ,ÝpUáÕò}æB´µ+Y= ¢¯ðnVå^ô$QW5åyd)'ª>æ½%B,TïWj ,³]ê5±»ly¿c*¼ç:hã¬vÝñ½sK¨¢t¡ßEÒfâIÅË%óU04Æó(UçÀçÀ¿¹íÁF«ÄÏ>pG*F|êL	XPÉCE6 To¢¨%HÃ V«oô/±0Â[kûj¼çÐÑ?â1øÂÎ+6B}4ìn9øHpãÞ´o½Ùá±¼ó~K¦Ä_ëJFf¾»*xsª= õã¢ÜÎ¸ÌT<í%óæ5ámäÌ·Z35 ¹AýR_ê6P|a¬ÂC;¨Ð#Í«Èn½@ò¨CÌ¶§ÏÀ3~®»[Á3ójúõêQö¦ðÒJ	}GêQe£ö¥²(;]×ãº= ®ºøÙÏ|úíÝ9Ù½òJâ7åÓzo[¡Ðê?å¿"úc²óhÄt7;cL>ÊðwE	Ùj¿
ÜÀD½^Í(gijNéN4¾,×&+×&É7öé¢¢a¹maW1tJ:ÃzCE-M²úv®±zoÂ©¢üIÐ9¨AÃ{D[êQ
,=}éÔ:QSúMáå³¹¯GO|«á=}G½¾º5XX¹<à7ÊüUä¯{"&ðþ,Öv"BÒÄStB¯o»wBÓÍÐ§{#°É0þ¤æ^åéûRË¥(M¨	@ý3J¤áa!}Pl¹'aÏ6v¡hKt´ºûêûã8%GÑEóòkk&;y¤ËAr´ó³þ»}	¨_cwgÄB3/F7v60150 Üòm+þñl SÖÇbº,,0LÅ¬GëP¿,fF.#!W %øWÂ/%4YF= u3OeòÎi°ó©³r/RïæðR_Þ óýæôf°ôÖ(\öóôñuOÐÀL¬#Ïm+¡ÿ'!Ö±ÉuÞ{Z%Ì+(xZøD¨|öU¯+:^z¯>£¥kqæËSÖg±²(*¸Âör' R´°%¡±2x{G-ï¹NåÐzB¼«¹ígÛB:¢K)ZCB)°Ã0q%x÷ó¦c_cJ9^þ÷mb÷SlDK¯N,§çÚø¼­0+Î1÷-B],qH"TÎwpSV5^LeUúõ¼¨=}å¬j.iè{D»¸5øXcr]× &¿ÄB¨«Kñ)¾ßVË+Ùx'	ê§}YüºúÒª¸Ç¿±Ly>áòö ú UÚÓAp(SGí ü\Õþð¡<Ï0= VÄìØ%Vlö1ßÅóab¿ª?&öÄy{ßÌ1÷ODíYÒ²òÏY·nÒºâNø	´ä0èÉXç¹Â1ªÏÑ\äf±+°G= ·Ú.Òëæ>ÌÀN¨¢w¯ë gD©íw0«88Ú¢Y*,ô¶äéæ´7i«1íÂ(t8X²J¸YCShÍ_a8ñC NH«k-^[h=}
²28#'/jl¼7jßêYÀJÍA@-ù¼¡æ=}NsD¹Ô:Ôº~|têFÐ:éÕEÎeVïâ|» Æi= CdeÿìÁU£~úõ¯ô¦ÓÙR¯j«ÜV4Li´m[çc6;TÀ¨èê@cM= uLâ¥?:)¨OîS¾é=MUÙ1Lw-°«J¬%¨qÎ#³¿(Ý_å¨= ½Ë )Rz²ôwÊm¨èª£	\ÓÊË.z?«Ò\³Ò7;½¯¡õ-J°,õÅ7ú¿õÅ¨*é:ºûè$§uxÑ~þÄzK¦Éþë{kÊó½úázÃ~¿d*ô: ­c²ä*ã§å-I-Ð($¢Ca¼¡YE(QzYnß	ÞJ;à2ò=}þèù0ki*3ØªZY4áÄBfCWNóÊ6ðÐ[¶{u«mÔS¤
&öH¶í	T+.©«÷Q=}HM_ÀÍÍÜ!+kç¸>¿IqÆeõQ×º÷F}\=Má'ZçÑíÕäwÔ@Õ\\RðÌ³µJùÌp§0va(öõ¨¹Tñ¿¨ >¹vóóXG8]Rñ[]ïLEøªh)ÔPº.É5"ýÿ¸uä±½¢.ÿgj#M9T¥ 1<Z
ÒÛÿHC+ÀbÅÄé8¿;ïü»Ã.©»¶*ºCáÎÔR»äÓÚðþ-,¢fÍôr¦28=}aÒþX¡´ñíÌÐ=M[?üûýà¹vàô'GãoYÖ0{Áª?y»YÏàbñMõÁ.R [ôî1AÓ&ñ)¿»¦%GªN¿;G]Ï±Tdí¡c
N
µÜ%}¿(ÝçB6Ì|50Ä×ÒaÊ ®Û¥>,ölþÍÖTvYÕ v?
¿B[oÝwÕ<kNÓ[/X\Jîä\ÛhìÛ!îx,#¿Uõ4PFiÿ-,#°ðdÃ]´Q-t×Moí(tÒyf³ ~ªÌSÅÉ½*n%´e½È×ãÅ~$ïÁ+µP»håÃä>îÐî{yØ©¼ú°FMÛ£YHû8ëïd}aûàfmý~Äì=MáïÄ?xæÏH^Lê Uð¢âåÂÙ7êÈQei÷\/oUZóWí£WTènIÙQEå¼èm§vB: ÉNí	Sc[×»peüIMÝ<Í=}¥rñ¢«Ïu|7'Ë«G	ç×ôÆëÓûc6Zëì-ôþÌóG¸&Ã¼þ£¼8N<ãÃDwPL= µâÐ´2ÃvÐ-^ä3+øËrT0¦TKglp©¦ÁtÔ¡à1iÕE¼ÓJÖ®A~4Ìøð7÷K<Lïw¬Àþ'Ø¬¹7»ÎÏ8ó.c¿(B(ä8
P¼!Vg¬¼CZ{q´®¬R!t1;2'¶û2úÊ¸áÞ>Ò|ÀÈ¡«üsÁOª0ÊÄPé<"õØ Å¹¹\t}7´¼ Ád<û¤.2tnÖÓqÕÜY©<QSg£>ÙÐ3ÒñèØÖS«$øµ.â=MüÖçÇÚâð«^+ÇÛXÉIj¶z£Ë^§f&*F©f'_4ý\¯e?)<>"Hæ ||:b&°|ÍJM^tñý[Ñ)ÛÝOØ8ùÊÞ»ø¿%L%Ûî"p3¹PCujÝusâÐÝ¾¿8Õ7ttS[IhôVä=},ów ôÄ"TÌÃ y0i³©GÂ­S½/&úÙQhÊB¿§¶©= yqRf	iñ#ZsÅ{Âdñ´æ1zùï_ÇÛ
95$Ö^~ì"ÌZ'	À%»?+>NLB^ñÊ.:´Â¢÷pKQì{5Ë;´NÈ7Ûøag+2 áìY=}>"çA¢RV= HbIN3ÄEAl=M=}÷Çx$4F:a-= ¢²bIfØAò³H>Zq³Fm©ÚA2L8¸_dðN%½TZÂrKéÁ¿"÷LWÍ¨)1äJVwËØ{@üîSí4úÑ¡*þÆOL´RL?Ä	qLé=MCÖO>²OÌ²o
,8MÊµÝjnà£{ZT~R^¼¸®1ëòBxãqºo\,nB8öÄ4ÏÁ\ôãg·2¦µ¦JR	Ì§ý8ÎõeL(ÙÿBéRmBe;}ó=M¹asRww{/g®#
qÔ6ù=M¹G©m3^zºÑOüÀÐûÕë%ÑØëc_°B3Ñô_!HÙT\ÇÔépo?ØéMæÏ:üäó{Æê¸þ>¡8dõàRû¹Y¬ÇÉlRNrÉtE¸Ýë8ìbºê)Á²^¶WièãcóbzN8-ËGÈÓÄæ89©6¬Án»þ(2ÐYµï©È¾ö2fÀGYò"SiRïwPEyEEbIÖ¾HK{ÍÊ]í«î7+ªfÖÂ¼ßØGß¦¦@rp»õ|= ¯=M^$-Æù]×}jTéö±ýû¬Õ~¬QÞ%W*´ÕZ.çqÅ»ÌVê> Êåti%¹®µK¿³{ç -A©pÃ·.i;j(0ÞÕ~&¡X3qüé:Ü@½ñL½qÿrÐjmIóe{Ü ·k£¤¼äï»òÌþÖK¹öñÂ°Ý"²h4û¶j*öÏ6|êhÍC:¿ÑÄ5Û7ü#ðÊ¶FRÄÖÛêÛJE=Mâ=Mz1vý#®òm=Mèq[>óZÔ¸ø=}'p8Ü¶¹7Ü½s;wêPÁõ)ÁhSH#Rå#<=}D?J$÷"%H©3ê[r+µ}bò7©Î÷åL?¡öP¾+uÆ¹ÃM¹8Y?Ä·nÑNM»ò\"Dî2aM»SMMÛÐ_|IôÈ_P%S~ói4&ä÷T°í¤sTÒ§M'c?¢üCÂÄå@­ÉLc
¹lHâR´¤º2\ a=MÔxòKÀoºH$«M jF±WÂ++*.ºQskH}½8>úï(2}¬BMÎ5±û´"*tìÈJ¤È%J­ñõudÕùòÿ=MÏ}dä©­*[Áç,Î¤òºIÁì+ ïqìfï	°ò!½q¯	Ðíç@è¦@ëGµ\¼»r3bãäÄ×ÀQÁè7ud|÷±-=M{þ¬~³´yÏé'ºm£»ÜuX£Üý1"@Âißçyã¨oºÄìbÞvüì28ZK  £^¥ Ø5)af}>72Ç¾¿¦Î=MäE§Å&ÄèöóÎ¦$Ê¹³*×d¹o 5 _f³9öæêôÿ=Mµx[¼»Í¨£>	¯L= MÓèdÀ|wô îïT_EóÎi?(]ÿìm¨¬.ÉyºUô§¤ÉúÇaÏõ¼¢ífHbQÄ}CyNé¦å¯÷ºcÐÑãtE
£ ®?Ï!ÜÛÀå!«ÍënAf#%B]ñjgCìNvc÷¨,Õ5ß´gÇRÝyc¡!2cÒ7¶"èv´~3,ú·²z³¿= LwÉW¯Äj½pMüìáÍ\ìMÙW°lnnÁøÔ*s²RûgyØÞÔùH= .±ð[cMaå&Ê¥ l¥6"ÊÄEÌâØÅò0R¤¤X ³= mThÒ6°#S¶­<#³crÑ#³arÑGcË^sª1Û$òªG" fS p+s±ÄË¯£?Í!ÛVÌ//ÔÆ0~32Rto\Õ îöäJ[äL"ªÑýMÁõø:×¨Ú{E©h^,;üÐOgDF+kz¬Ôì>9Èà^hÔ]èíûSÖ¡G= À &µã¶7mX=Mù?ïE¸±xç%Â1ÝÈÊ«¿(Tå6k®Sç(m]$ª@:Ê|{ÍÔl¨k/l§Ø= Ã©?RÇxÚµÃGú4UîjRSuZ¯eYÚÎ$Æ	AûzXø°õó4ã¯ÎùÆZHèýú!»øs«Ý ,´H°È ÂNÎ§zNÎ4ÚVkÓcÇ¾¯õ)/ÂÇ¿B¹ª°Q]gð5åÐáËXëÐºsðsðsOI-	öB1°¦ ôÇüÑºsh&¨ö587ÉùD[íkí æøäíAaÛí!æÿ]³j'ö´mÚ¬®m= !Î-@²Aj%vÃR}¢]Ç(s T+ÀQM]ÅÇã&ÊwØGòõØÂ!öÃi(ìrSCÞrQ<WëOïµdÔ±××I+¡ÐÜlhã¸ùÉw{å$¹±¤¹FTD»$¥v­~ Æ:J;E/Jã¶aª.¾©Ýü	Ôüe÷7ÀËÎ®0¢Æô}gÜóßÐ*¥RtP¼I*®ØMï-leÍQ?
Ì
Ä8AÎå ®ÔÕßÿÕ4K­âáðNú£Ü=M^­]ó÷ùe2áð©Ä&!¼¸Së¬TÝýÏV¤QÏ*Ä|ÐÓMuåÉÚWÆÀøoM}ïÚÁ+ÙÍÙ¥5ù6PîéÁçtØma¥Öh~y^~]bYÂipîd5)åæçø'A&+íûÄ5Mµr÷hÝ¤]aæáð­#[F¸gÇÍÖzÝgKMï>éª&<µK)¾Ø!Åµª{Ü¢íZ±¶¾6íÎ"Ywâ×grï
"úVZÛëá9³Ùy>oõÊÈõ'Ï5ÚwÐÚ×Ýg¾fOý
@>ÛwÔç+©ó>ÏÜiUó¦îwèóáïyv7	áBëÝVà¯é;¡1=}7âq¬«¸= OÅ8ÎP¤iËþV,Y¥SïfË·Ú
Æ§3¿X¿Xßàä)p%d2âÂ¾®ö$±å_§³·ìÍ=M[ ºäÄWIÄÎfKÒáItü²AÐ§õ÷ÛýõVÃ sI4ç-¤N¹6O;ãIÌ±¾I´Þä_M%xø·èsâ^ëú=}ÙqÐXªõ¥±dá0Þ7xâÈìíÐÀPûc9TU£î(³
 ðØÍ_Ñr«#¤
¤ë=}ßRäÅûäÈR·-xÍÿxõ*{dîô@±ò®¯%¹ÒXªVà<ZÔÚJ%/òÿ#EDR QTE­\K_ªçÜÅ¥üªÏÛ¼í Ý¤RÈÙ£ þ|ûîÀPCj$âªù	«·ÆïÈ@¢,'íYÿá>NÍUl¾_ú~= uðAI××ÂLµ&v;HPh"¹¾¡Ô©·;è÷'ö«ï «³Ú¨G©rÂº4ã½BtY'S=}pèïL8§ÄNº¾È¼).ühq~b!ëý8.ç]l~ÑFHM?bt:Ä!Ì)¤®nKæÂ>WSy7ÆIØu¢ªk*MÍ-Ì$¬>^þtq!©÷ìÖ!aQ¹!U\xz¡¼÷=}|= Ã Mì ±õ°,Ò0dÖyå0TØçXKx5Çg³Â7}ÐùktõúÆ¦è*4Jqd$)£ÌÄNzu·<ÿ  ¿&¦YÚpôÖÆË²Pd½ÆqåÍü_c<¨n74¸åù/íB¾O(>º´yºÄúvêÔ;+"-ÛÙéXëB^Å/¦ø¢¹®%ª[k¬m2\ks&­¨ÀH[hÍ9[F-&®´ZÎ5¢øg³³Z,èNK#>iænÉzÅ5"$4%cÍõlfÜ F=MQMüÁà·£k Ìë4RÛ/L5«Ìxé"À5C+sðz9n	ÛQ÷,ÃHqÅí08 'ñ§?çNÀÏ]i(XQÒ)âÃ}ÖûÛ¥ÅUè$)Q¥(zçÙÏ¯KgG(M¨ ª!\´x=}´¨¬0kCä¦l£·±¼FO=Ml½1ç<<ö£a£!qærf=MJÎÒ¥Xä¥xÄcÚ¤÷= Xsòhsr¤Å±õ= ¹µ.+kä:jps ø,[@-6Ï@¿ØÏDW_8|×èçP AÁ2fºµJòäæFºµ9|juÜ¶ï§Zp¯e÷Y±¥[[eB'Ý.>KYe2B]äö°åí·°e2ö9ðçk¯eö9âöYéB"ö9­[±ñûÙ¬e%Ì[]nlÞG§evN2=}¡î6íMâ}dµ«&ÓQç's|7ÁøMúM
B´[aÈD¨ÖQXçµ%§ôÛd¦ii\+ «Ïå= C2¥eÀ¥U/aèN2°'­§¼Õ«JëGÐ <÷¿õfg:@yÊ ·g\ø^76RûG×æ]ÄÅøØòjûzU$oT+³öJ)ÊâµKnIóCMÅ¦üO³@´¦}HB)û&©ÔLrD}ÿX8óÅY,ÎÓK¢L¸5þÉþØ6>óE[Wá6æ*.5Ê1ëÑYbú¸ÞD= lH§û©H$¬÷ûÈøU¤\¼qO^.óÒylèNKbÀr
3ð#+o{C%3°*ÆÛ¶0xõçäF÷ýwÅkâ¬>@vÿÊ®dë°$@É¼­áÒn
Où½§!ÙÏÝü'	ÇÑ¨­¥ìªwsy) {H&lPu7%ÿí"Ý È0{sÂc®Â[Í½0Ç?L¢ã¹Zª®dL¬¶ÆC!ÂÎOíä.Ãrøb_É1Éi1ÅK*Màm,}Û>þròÒT¥vNYë §¸±òL7´Íb 7Io×ä£ÑïãJúuË xBÔyÛéfåÝ¦ÁùïiýËêJãÔuî×\Ý±æ0À- ãµ¤Ü5i ;0&«i|©|?¿¬çÈÑ=}°á+
zºø?CÏ®ôÊc¹V§Wùò&_[]@:1øfFb/î¬91ªÇßÿ#ïVì3-½°P¸¢IvåÙû2-ÃÛt¤£ö)oV'ã¸,óî ¯mh$TNHwÏ¯¯ïþ_ã°,¼Ô²ÆoC$Ko|i qIu»úÅë¿Éy,+-YùÔ~õPA®+Ï_éPuÊvý¬Nô(
#RX²«s$ÀRý]cT SÝÍT}³2zbÑÏþâÐèõr¯ ê¦vÂÎHð±ôAV°ü%¥=}öaåg{4#£j>ð²mohüd½Û²Oïó5C´¾UÌ\{öX.Õ¿v}ûAjwË´­ j¦øçÞ¿T%ÆÀ¥øZZ3
üÛuù6.jRØdç ¢Z.~OÆ!,¦jpÉ!j £Ç-9¬0´½·°©±ä4â ÓeJÓ2sÁIûºÂÎÈNE$|Ïtl­_iäÃðcP¨":$Q¸G:hT
@{þ{È}Çf!BÜ  ©/s|aß}=}FOìç­P¬4<!ÿGþGÃ9®!Öìã%î©6{þxe.í³v_3ê&3[= ½·[½î-ûg]ÛN_XÖvã R=}ip)NNmP= °	§)ÜÍå±T=MLt:A êòÚj%=M\÷ãCªWmgMÂi ×tù­ò=M*à
&ÈÕf|¿»¥= vÂúÄó# Î[u^iÐ)¬(lAÈ3|¢¸¬"jv¢®átûkzv¯v91(ÀJDS÷µc,k³7Cè×%¼*¾ÝMù+æÂw£ðîEóc7ô,&?"ÞuS%¡ÿ/©ÿ$«üz®"àx¿úwÚþ4Ôd¸o6d¬¤ÑáÊ*,®MH6ÿH¥tæèææÄ£Ó¼ÃHÜJ1/oÌ¾'{ÒÐ´1QôEÔ©Ýò[zJ,Ë Ü¤eNh ãHgÃ]"Ò¡¤YÛ2 óGvsfé:cÓ2*ß,k.ø}¿è¯¦Éðäï6_µ ÷à,41Agy
æ óÄ¿Y/Gö²[Ê5>ÍH¨r^¹=McJ=M©)7°ùlU­äç¿Å=}¡«ô~ÐG §s03Ð:TTxÇ@Ô%AOÈ"(iû³^j m¶MÔ Ì\·NñsÌÒÍüÓôZ¼ÄÏÉDÒàO£ÈüôÔäÈþMsNÑûPçs$SÍx $ÈfLÅÜÉ	y\/^-ÿ&=}ª·¯@}ûFçÁ[ûo$-¦bÃ÷Jtó×¶]FHñ"FoY{>Y<\¨x¥ç6³¹K¶Ú¾FxXÓ&q:©Iï=M((3¥±ý|ø'Ñ³7]·©_ÖWÊ¾Nwr¡··åÈÙÿ/S8QJhùÙ	¿KýDÝêÒY@î{_#ðÖbÝóöµa=}²Úv¸Ð	{}QÚ
ÐG;|¡úòªkÈ#~þV:f</I"©9{)\'¤l0_Ñ;÷äáÌ8ë¢Ï]q £tªþî¯B HµÓb½ôX´,¯õÏ?/ì¼rêÂý "KM~FÅ¶8ñvñø;_#zõ=  ¸¥ÈÓôi&{ñçIùJñjOVaéúÖ±Yô?q:ñe·¦·Ð)LRy0ClvÈÈusã9÷ÂrÔ|i'dX'ÀtAýêâìL!×[¾[í(í{â[K8áØC£,]ÿÖÌLQ'ÑÙáÝáâWp3xíAöÛiº×+ßÉ+°;/ ]9Z'ó<þÙnøW»×t;ÍÊz
:Nàæd¯	ó¦ÄLÞÔ|Ó¡®\Ö¤ªbNé~A³wÅCúHJÚ"ög¿Ý$}-¢"!\TuñOOX§J7yí°è+»ûa /+³_ä3e¸Áè|%Q ªªà¶WÌx7$øcË¥æ;¬=MìNÜÛÅµ&\ÖF\Ð2E¼ÒC[T¹kÔÇ§ÄÎÊ´ØGöÑ´¢!ML³cçRÍ_á!cd§^IÑÞ¬â6ÀÍ!§Ò{@±«¯(-= gKÙ:ëRË1Ò°Ô¿T÷sÌè^¸ªÇÌøePaÍò¢P1±aÝÃÌø7J r½F«Ýª5ÝËlSÑTí= ð×OÿB9©ÿCsÏôÓÊôKVµGc¤º¾(ÉÜ½TFvÏSCg²»Ûb¸!p{0<T¶³T®· $Æþ·jTDÂÍìcì7°ÓFæ?pµ4ØÜG2Áb$u&;nVj5(¢L!ä¡"ÊkNÌÃä!Opcr£¾\öûInÙ  rA×tMÐë|@ÄÓüPCOÊ¤u(ì4ÆfjP¸âïÑû.éS rr>Az2-o= äYZºÙ9*BuÐÛaúm¢ðvÇ¿ÃÏIísTê;1¿i½ø2alù¡z¶ÿB:Æ>ÎËµ»ÃµÀ8§¾47¤¿) Ìº,C4Ï{Ôölvßáhq´¨:¯?[C:2a7Aý;/Ë³«7x¥¯ÕPä¿õ¡ÓéGàÄÌN=}»JVD¬ºy(e´ÙTP®TÑ^t­,Án²ÆYp@ÄÅ¦ç½ÍdZÎö:xD±Ãã©AÂa9ÈÕMÞç=}Ñ¡Å½Et¢ý¬t1ê¾û]Q±°ÝÑÆlW¢ä S!:0Me®oSÄé "Ë®+],*Â§N= Äà×$pÃ&³â>»¿T"pSëè= N[Ï>:JËÖ}Ê"Ù
À<µúÞE8CC-ãáßÖ-ÐºEt Lß$µ=M8T@4xÍãRHkïÆNã7À1¾¯îÚó±ï3Áñ¢íY7ÈMaå¡fïjG\3çÂ½Ij8Ç[Ä²!´ý
FÄ6ÀQ:[°ó6Æ¯æùÇO(  åWÚ^õûÿ4ðÈÒÉÉæFÉ;eÏôd35ØÂÄ,åbrX[ 9üø«"ñ°ÌÁÙ	¿BN:ù³p=}ól=Mò¡Æ^bù í!'û¯s¬dîvXïd}(\´i°
è£¾}u+ü\ñcT=MÈsð= ²?jÔó~0àå9Ðu;+M<°dÌì=}<^y#qxÆª$_º¾v:´¤êÐkNä\õÞ-Dg0=MÕÉOÝHB ÑøÏü@?b¶ºH;XvüãäHæSsÒQ[+Äí.FS&é¬Æ!c>Ì
,Òâ,Ô3lR÷ÏJèõ0²r·â	zk¨AL'ÛÃ[â@fÆbÑÊt·6eÌfhüôÏ&9ttfæã9i H»³
Ì	A=}cÄö~òý5Ø S¢rZ¤þöÂÔuÄ´Z(¤>÷²¿1d»¬r= ò\ö'7iµh¦utë@ÅH!K .BX«p'3µúEBä®%© ÷ûc<è!0jõñpÖd<1ý06GqCï{ãÇÌWÐ±ßTí?;øÄ=}âçI"±BÆpöi×¨õ\Ñ]Æ}2Éð­Å¶wÁü¯õñ.AÖÂwíuÜV)ïÆÈªÕcÖ+AþæìgO?Åà>ÛKØ&!È8!üpD¨ð1F<Mó­E%ÍN&íb$<Y3ÌÉ*Xä«ÅmcÈiFø¤'º6|gw3ößã¡GÜJþzy­ (÷êé«ß¦­ê¡â5éL}Üw$iQ§3.·}÷)ÊWaCXµhðêGrOxuêHsÃ>4¨ªvpËâx0ÈE& »î=}¾6ú%TDÝ|Ñý1¡/¿Îä5UíÈoOl5ª;õêÀìªÐ@'Õ
Îlµz2#¨{þÛ»ÝzÎ¢å¿vÌ>î{ÕÄ<.©òÛF£	{
©Í§£é×có(²Äùe2l ^  Çø²béÎøÛùßÉëù®6|f'þÛòþjã@IÚÔð1ÅHvU·úÉÉ¶Ò=Mr1­Ú£ºÙÚôÿ}èõ Àçpg=Mã°»enßÜ½óÍ¾Ê»÷£;"d¬ü]þQÜÂrëI¿^òìPë^þ¢/n¥11Ö-)?PÙdÙaîcà,1¤ÃÜ5ñööOñ+m¡åcï  êðàCkuPîèô±(vÁc¤0óY:¹hÎù-&\åèí;^9a)-òÜq= ªú&}ÈúºoÜ÷â+_3¢ Ë¼E>'Ûæb¬j|*_û¿ 97Vþ40z	÷/r£ Â³ÌIÇöl^¸raÀÙ>ÝGÝU¯²{õÉ7»âI$¿è&¡ÅÑ(ocb8{úÁ--Ù= cHnu@è!ÍRÝÁªã Fß UïE¶ÎGÞB6tÇ#N.ºqºB0Ï]¦GCÌ/*ÅÏ)b¼t°?6= (#áÛ{ºûÚqá}|ÎAJ)îèïº§_ñY8ëj ?¤ûf¦î ßgôÖnÞaÕð2LtSERº9B®×yÿÛ3éõ4JÇËÑ£úæNe0(2óg§"zv¯æî~+ë7!µ¶Å?Àú#ka&À7_+äbDÿÕ¡Åmô¦«Ljýs\X2G@:óÇ¿_nO6¢= ·PºSBùd3Zy/nV£ç¹QS=}i_.aCBw#BÁi*éí'f¼Í?êZè.	~dÿ~¦½©{ÄÖ;EaXÞß à÷Óß= péáIF&(ññ%ÇEÙl9òÏ_,=}Ý [~Cè®ã3>Ü&ÜvÄà3Û9¥z+#ù±´çù'DG= Ç!%ýú(«zGw	7,;,4õ«²Ã³u¥>¹è¾ÁâÆ,-±y%µ§º"FE=MXVä¹ÍîÈOwkEY§:üé¹ÿ!Ü/1Ðþ»eKÿmGj×yÁUêí×>0Ö »5pßáêu/ e Ú§{×¶>iiëmXàÁÐ»59\K#QæÄäæÎnÃÄ=}ð­§3Bð\ÿ¦³E-r6¾os¼½8Z¸VªÅÚßX¶YìªpÈH	y#z´ j1¡8lµ¼/Rh|Ò·Gé(Q¾µQ0Çø­õ(±°î"¢êA,¶GQâ*XÛ óåB,åB{ia¦bÙbõ¥ÈäæHZòö9gÙJ7¶¯iúú ;¾éP3¹¸¥ÌÃí/B'âµ1¢©ç M»µ6ZúQüÚñî ;ÊòàÂÀ:sFR´¤hþ7©YUw+¸Õ;Ñ?&ù!÷ûFÏè>}ÿ^$åDéÀ·uÂí¶W)ÞÙ:
.|¤KËBº4AÛFªYjþ-Îq2k£èÁ}1Aÿ:cÛB&6 Yáª¨¿KÀm=}òôÿ%;6'êÃW#ÑU7lâ>Fëgøb10NR«uöÚw ë;.ñ'éiDCÖÚÝoÊGÈåÔ V¡Õ~X5#»ñû1ê@¡ñV2[P´k2×G°>ºI­} [wVÈ"5|@;BÀ?À:lyNKÞo´
û»,§Ä·{´>ÀÉõ×.O[÷VVìiÝ÷í×·OQýmià'8@p	½Ù	ÕÖPOµñvA£´Al«qíÃÿOÃWÚKÀ?A± %Å#û¬Jéí¶Ae"¼.U|9¼p©Êß¶±mü¶DçO{ÞMtÅ¢§nèn#ëÀ¯_²ªQêw¹N'T74R2Æò¨Hib=M´GÆÖ3þ[Lñ 1®_fÃü·+\E!pù?Åånsz#òoÿ	®	}Ç	ÆÉÙõ_
&8ïJïEÕ ¥%§%WqÜÑÉí·\×ñ?az¾ªD[½®wOßÚ¹ÿøAEkà¬×¸£áz°#Â=}g}lü!ö/9½¾gv@·àh;oWs*ú2ù
¯>káLÏ£ò59½þÀPâÍtæp8Û[
]ÉãCµì³3]7Á×~0ÁØ«²:¤¿9®¨pöfâéÄþl¸³*Ú+1´mé¯k^Ä¶Uùe°ÕEéç^¥£H$SÎYÆZ°3S<¯A¨´.Vs	A¨O²r®êÓú_ð36FÃ= péþ	Óz= = p·µ[T 9JT6¿K>PºªTÆ¿K PÚÀ¾Üø¶DV¿Tà¹ã»Ò åàK÷ífô}Ó,óqäñxêtL*±êÿ@ÜP8µðpJzhÄ]	Ù.j3¢É}ÞpÐt¡ª¹9B(ì\­ýsw­7>ÙAäÈ,Î>+X)øçöG±OjàçâÚrÿ;ëE-Z Ñ6NÍ:Á:'t¾(hò"¢H;æØWqºËRStÅ³({Àø'+CÁNÑxñ°ôß{MíXaªãÛùÝ½L= Ìþæ}O= ½:Õ®ö(1ùJE{vGÒÐXm··	B¿×FqfñucNè0Oö\'cêØkmÐzôßîQh¡cp­|á
²¥(G{N6E§y(+(¤Û|NmxN¸i%el¶"´Ç;m5ÊpÇÅ*ì´öYª·î^çS6K¦ékÍ1\ÊC<,Ì·']]Ävf£ØIéÙÎ¢Vë¥·¬[WK­ö¯ÒßæX]ÒÁ£B0^¥nHK»y­5Pø­ÛN¨FªW$ÐiSF½3=}ýI¯ñpöºWtß6ÚÖyR³Â8àºßÑÿBO&n Ðí8Ø2$%°Reüvt¹BÌ¦Þ¡®"ýY{25{±^£äÀ¬òð0^´K{ld¤íS=MªÜ­ïrc<·ÀZÜ\N}JÜ8&7¤öPo¯dj¢Ce¤t$QC;]Ã§Ã§¹ä¤Sº/¡2¯nsËx oÜ³i$¶e¶â²Z0å±DçÊ°G®¸HaÇ»¦=MØ<=MÕý'¥mfx«Ø[©®´úØ}O½.¥GeKEÊ<åL¡Ò0¯p:NÇ	Yª«7í¼õÛÃçhÖÜâÏV6 B[	ÉÏq¤0U¥òÿSæQÆâÆ6z\J5²É0Ñg(¿2ÖÈLý$X­¬kªfL¶{¥X*á*~=}öÊ?|RÅo@ýQnls¬®¡ø%Fw2õ\¨b/Iºk£Íf5Ç=MuÜ²0¸1 D;ÔÃ ½Aó:È,ªÈPs{ö¼£òªK^oáÊNá¨GýA Èòz~³yF½Ü@xýmØ!åkÐA/Z¼ä jBAò´½K#UèKÀ¼ánRÏz

NUÌ(nÆb×= T%.yÏ;©ÅÇ ­/ºÛ$= S>Ø;z>Ìþ+Ìò!2ÌkYGX½òCR·0ÎÛ°Ï¨Í'íM³®ú\HâEéû­÷hÂJ~=M ñ×ÂôõWÈ= Yñ=MKNÉû)ôÏrÒ<ö5gFNuZL4å!Sa }Á¶-7òo2ÃKlZb'=MãßÅÊ/Çc-´qÃeýû²wHP.ýaþFÜï!ðmÁ½5®Ø¡½m¿yyf÷êÈ®&Õ ñì¾ \RGâ½ÚS &äó9*	lè/£=MÅÕúèLU´¥êí í3D+pÍI1ì5È Jq-/ä-áç.AãÝÄÝå½b<u 8®$u[UR§>¾²òI°ú0 0BíÚþîk¤¯@íÃõÝ³2ÝóøJßE/º'}+íoKK=}Fà©×ØZ4Ù±M9¨'²ÆmEÙ' 6E§Y|£)2=}Ïòß= éú0 aÑ~Q ¢vvî£ì¾* ²ÖèOå} ú ã¶"|(oÞÐçòÄ¶VR6{~jÅúw~ª<ROÏ©ÅÓ± Ö^åªI¾4é¹Ö7pdiLr6
¶SÒkÇv¨¨±RHHDØ¢øNÊmàÅOârô= nNÛÍ 9Ýt¸À©¤Ì,Îº:EÛÐ1Ò#\îâ´üÖA\Ñ,3 zzÿÁ7 foè¿Ó?£@±Å¹	ÆêZàÛ*Ì÷òÌ¶Á/=}5ãòC¸DN= Ä98ÖLºÆ¢ûiÄLR¸þâX¯¿Êø¡-SÜë0¨ZáÒ\×½>V0×|¶ÿ8MÕDµd_WX2Ë[Íqô.O±aÝt"ägÇ÷,º­E±¯´0ÔQô([¯ú{	8YÂOe~»N GÚhád:ädEÌÁc¿ÙS»´1Â]o	²¬:I²ÎuNóâsvÏ8Ú(IQ2K¯/ÃÉ°ýÇZÇþ©'Yö_ÿÛÄôÍtOyÓô\¯$[átßÔá^ÝåíGWÚaÈ0Qx¦fnù*=}éìMX)PwD,vó
p$ßGµA,ßC< Î2ÓÎN¯Ã4uù= Þn8]L¼gcDì8ß~´®¤ýO4Öëªõ;]mÞ]në_IØa7:{lS ºkc'	ôÐl²àa±À§aTõJöóÏ@wÀ¨Uymý¤ßWAXÊ·ûñÎ-Pv+ÿCÿª©^Æ)B·#B¡bfìNL±~©³Û¹~\c-TüÌéÎs÷DäN²NK¤ÉêNª&[Á ÝàÏt)É¦ï)alÁêlZñ>¬ ¨ÁZ0	uüÝíº8¹ÿ­ìðð.¢X){
¿»8Âý<WD¥â¬t2¦Ç= U¶¯Øù@= Úg×ß¢Õ÷2Ññ¬Å3êåÐ¹±¨Î´¸;=}ÈY,^~Ë#Ri£0uñYï©iv;¶ë	w§(w)n«à!ýöXE¯§ôq
êYø+2NÃä?­z&·,=}gv+Ëöq9YÀ¿KwÕÏSæJµÝ¦ì+*gJpÓ¡O?üªcóÌV%alõÏ©´¦Uÿ= ÎMV+´<Ç@Î J:àf)Ò§|Î;ºØÖÆ3Cv)Y)Ê´¯cÖ^P&ëÚÒëÊw|¶¨ÚsÔ´V´0'UxIGÆ_ýKôu×K2>p~·6+ôZ3¦EPÓ²Ö>ô®XÖWûéJ7ñsÉ²,!qkµo
é sN*k·v D¬ÝöÍ¬t²Xå1¾ø@ï²ó)nËúT¢ßoö,@z»EX@ÇéÎ_ÔT>¿U}k
ãK¯2.ôáQKÜM.= /¾+¿³jiE°u¨kÃ0<=}±ÎÓp£4AqhL."CXaàãÚ¢} =}vÉh° é!¢.ª_çß{S½¿Öß.¬q	¡ý½°ñËÅ«|ÅyH&TÁß=}aÐ_!ØÉC× .p¨Þ}YÃºc~ùÅ|gC@æÖÔB­ìÞÑB8IVõcþÙSn µeÊÐ¬\¸ÞYý=Mf¢fv~Ù¯çi+öÅ·KV³ê×9T¦×kðtô³õC$9Ñ@×ÀÉñfæ]®ó©æ\We«xågÇzRËß«¦/<Qþß(gÇ(ý4¸6SyoWdM'!¾x ãÉ³ÏA'.)Þb°ü+Ñ*¿p°S²aJ T«À~ÓLïSk<¿ ýQÓ'ÊfV6ñcïq%-=Mùhø;ñN±ÛæP+ê\hß(ñ|#Ó@qP ¾ÔPÞ²Çlê¼F~D¨í¬ñý.0pRÕ×âC·U_¸l#¾×dwèHîøònØé°p8{FÌ¸x&Äþ©=MY!Æç·uÔ3¤M6¯Ux£Ë¯ÝñÍ<Ó|:E±¥Æ@
ZÌ3Ã²Ìwä¤3Hl9rkÎÈ9öß½ÈÍûÚLtÕ }]ý4¾eMÃúï1LU£fdìx¤½{~¨Qt!6\)Pàs,Ì´öoy
zÂ#6»WF³Cbuè1¶+1í6;4:ÌÍ;3iZQcp<J9$L«pO¿°îÈMmmorq×ÑË9YÓüìßÔ!X]¥EIÍv¼H0ßTpOù{º	íæÍ­q×,¢MÅRé7ISÅÔ,×uºÀ'hé#kz3¶î[ïøA#ízµ·NDó²Ãü¯Õéyîî¤[Í|æØÙÊ\O;0Zõ'X¤<®ÀM}Ì~ÒïÚÐ¼¿>Q±Ôx´ý=}9dJT½díÕRÇqðÝà0/Ôp"¶·ÞÜÑÊ¦Í¶¤¨W-éÙä ¨¥ã
¸¡ÑÞé<ìAúÕ°Qý¼~·5y¦ÎÀßð«.ÓU9Â£dÎ5Y´elña¸«ÜÝ=MnAÿÔ&aîÇ*!¼Rñò^òo¼ü% 
S2ôä¥CP5àH»·ìî¨)sæE´iÝäHÓ p gµÎqæ@/Þm\£/´Zj)Üla@ù?X8h6§§45?#þÌXÂÿåÙð:=M«¶	¯~µ_ÜÙ[üþÌª}¹'§ò×¿l%<2(l'îVWQÄðjø]ökxd¢³êeu^òf¼ÖSÇSÚB~Õ| óTb[9PN<Ý3¾%j©OnUÓ¹rØëÄ¬WÆ9ºXiHÙÍ"¿%ÀtlI¬ºèíîò{KºäïP{sj 5®Ñ|$AZ]öL»mÙ²ª,«ÃãÐøhU#òÐz{é4grÑfðtµÂúeZï³«_áÖ»6\óÐüå ¬3p!5¬òÿúÍÌzñTÒù×KHÓº:"®^ã;C¼ùçÍ@~*æõáFÏ4¨ã:µw«Æ\.Ç	IòB¯1PIsU¾^;Âñý
Ò¹ü$,îÄÎ¬C¦¡åCV4MÆçaäò$2ôú$\¹©qèaÄ±Æ#sô@Ê]HpH×VÚ~0@Ï5[}2= ò¢[³ f;^·ÜNo¸«mÒ¹r®/z° tÔà?è$5«18(Ý=}ÀîK4Kk5[µì»íÙ/ÆEÃ²:@¼{èÅ­Nu®y3_],9å%Ýp9Ãm fã6LÝ1Q°*wKºù7YË¿KáÌc-R>{;Vª«ØÛQeÃ¦îfNÇÈá/m=}Ù´f^pTìuZC¶,øýÞRHh´PÏV$R ,ç8hrÆÓZÙÆòo±óÙ¶ÀxôÁÀûÅ<z]Ò
T7Y½F$I?²¦:¤»­³ø5©;¾]°ö­ÓZzdVÛb|¤W¼\øjbÄxÞ¡VÀ?C]ø5ïùx1]K2%të¬µsXóV£V}=}= ¸¯µ7Ô!øTÁ²0,¹Ïa]«Æ¦æ]æ¤
ðÚÁEÎ¹´xÞVÀNÂ/=MÍ aB,hOÞôoi÷Û4qÅ^Uù,¦ÞW~è Êþæ¶bxçªà'}½ó¬ùY? Þì#ueH+ÑÎ vÝd2­93wE6OsÝIý³ÈîôN, ì ÀÄó0øMñ]ªÁ)ÂÓhW¸±ÏÎê½§&'L
ß#HCc]æ½¯ ºÖMÍHnú<%ÅÑØ 1ÖËâò&:òZân\ÊÈûßF$½ö°ýydàYí6tIÎ·=MfðET»QQFXóß§AðÓ§nû,q²ÛV]P&Lß= ac3§µdîET·@vÍÄÓ¾@Xþ©rµcQÝâÍ *öZÒÜ7"´´ãÖpÄSbw¥úèÛÚmçS\kpLçLÇ*«¼(í=M@Ú¸xÌÁúÈ(¥Ql.û:Üw¬2Ê­þeuïb!íeä¤át4¬¸¸¾8G\¯ý+]í[ó¢¸úýYkH,iaÑÜJÄì Pþý½Ô	Ý¿cLúP*bSw] Îó_Ò!+£ÃµrÇÌdÑ@«pD½þÿX®ß2Åx/ÕýÍrJÖ²§ÖñyÉ@fYO¿Ã³{DELÏÒÚDFLÞz.±ÞÃ¥z¾yCW E\AFTH®¶¹PyËhPÄT¹iê_¤+¤ÊWêR1#QfÒÚõ ¥=MãÿÒ};°+ÒàºUñKghÅs|KâEëúõ$ÅhÄw«*?=}»«\Èô<Òþõ8üg!n»¤ÁÐH*o"ØÝõ %CpTú@Ô@"ZþJÄvûRàìÛ	}&w³úIÖ¹ÞK!ÐT¬ê-¬+ÿ)ÖË÷^7Ò°òÿÅ:M,ÖêU¾HÌtk¸@³|­$Lè%ãæ1Q|>gGat?+¯ÑD¬WÖîÜ¼º ÆyðR1çq'kµÏqÊñCåÐù
À}ØâÖeøÄµyvñ«Äpð1½µMÜ
ÞKÇN.ãä=}ÍTtp'ØçºÍÐ­Ó.\pÞ}×9Þ?$KB~R´Bè{¤õ,àÿÕNW(=MPîgB=M½ªâÖeFù0KÁÓçKEÈ>Dï×õ %Ä
ÒçÍ^7PÍ =}ÝUñ"d¶cì"?¾N»qø§UªwdîìEÑB~{Ôâî|o&Ìë?ç)Ï#-m0[#à¡ÁCúuÛeø}&IN0_\ýwV²¤YåÕNWnÌòq ÆÈqËÛL*ðeFîêUsÄüÉäÿHï1¼ÙiØGÙ§®­¹ ¢®-Òösu£w³gX=MHtFpTz;i×Ù+$ÓLzåäTA¼\ëÉáÖGÙjPÙÑf®?Ô¹@2
©IúHCTÅÕ<ùïþl²fß}Ö9ÞÿML þvÒH¡ùÛ¹?êõ$%>ÒäL0=MZ|$âõ¸c^|³@GFÓ-àbäeúýÌÇrX¬ÃA ¶Ì¹?kUzKïÑÆ¾·>{Û9±@þõ %LeN^FJÅ£y­^	GLf­pq¾AxÌÇÞÆ_-J¢{¸vwÜP^îþ.&ËtFÒ¡Á=}U2¼}f ¤¶·Ø^$ø28áªWÿsuÿÅ=MT¤î"Ô[a<¢}Õ9Þô¬tÜlYHx×GÙzbef¢±zT7\íØÇ5 = I@Ë?¸ÍC¨¤ìCyÍÑâ®/%ßæ)ÁQòmûûz¡=}xÚ¹Ö
Ö{÷A³«M´ö¸2¿É%è¥?ÁÂ«ÜF¬,ó"p@Ð¹?âõ$%èÉöC3ÑOPJÐD?Ø
xßeÚÑFK¦«rÍäÌ|ÀlîeÚêUª÷ÆéÈ"H¶\û;þªÛ0¾0x-4jf¢®J=MG¤l*¾ó×Ùüà:Ã¨9µ¢Pÿ¡p:¿o"ß§$ùíÃzpbô¦í²'ðÁ-¢+ÜÁt}óQ4µNØô¹çn­±VsOD®W#ÚÏh£,Êjÿ&ÎÐbçD¨£Ö çä¬#À&].¥jì×hZtCzRÇï IÄ3Õf­Çe2¸O·MäÝÛeâ­«Á¿R=}{0WK¢) /æeØRFQ®ö9¹FJ
òïeÜAyÞQSÙ"d¾Æ\zU,ÙnGv¯H¦À->@¸×Õ.WCÄPÊFIÐ¢²þÉ¹ ÖWJ²çsrËK>°kU¢H¨_|&¥Ð¨Â4YáÕnõgQGÅ.IxXÿ§n;Åç?çiô#óKóÒ½%zâÖGC±·)Fýve@Äð×¹Þ"¼ë:ø2(
öûís»þ´"ÌçÇÐNÙ9Ö²¼e¹u?ø´ (³=M§°Ë×?ç©¤ÇeX2l[u×¹ÞÿëoÊ¼G¦ËèHA~u×eÞöÄJÈ¡DXÈ¥gF2qÌÎìßöÙ9Þ;Û¤= 6Ç¦i(´8|£xäyéeØ±ÓÅfPÖÿonË½>r(Ìñ?ç-s²4öo·üÈ.K®_ÜY_ù8û@wÌñÑtUsBìyþâ°8[­ßýÜäê^ø4ñ¢q¤Ø	?7ôDúùiu¦*FóªÉòØ8M :+jw	°axl-Ìáÿç©ûËë-[ã±©©!âõÜ xøë> ¥~ûÆÎ2Q>UàR¶¬¦ì%Ì¯WFÎv,ûqù0nî3vn¢OÒÉw¢×ÙsÑ	ÄHÞÚ@úLDg Úäì^DÑÓç1FSEH§6çs¡K:éE¬É:nââËþiaå·ø?æ¨ÒjÍ»»$ÉJÙ9ÞÐäÊ¢¬w<¤:·:±¾Õ¹ÝZ¨ö0ÒÃV»c	Jsµ|:	Ð¸bÔn×9÷g©YVð\#ÉOþõ ÅaÎK¢¦ÈHÂ¤².9ÿuÃÞ©ù}
t2c³
½®Î ;ßõ$%3FdD+V£ñ {²ÌuØ&ùÁ\,u·Q»&kIék5Å¹³êý²½)AIàÖºUñ|*£üÿ¦ërÇ:­8ßõ$MACÏ­	Æ%h ÃÓÉZ×9w¿ÿ¦@{ ySÉG×Ù*æq%Q¦u8Ò½qdvûBFtd¨¥pk4òKuH×Ç¦w#ÇÍ¿ÿIÀ#¾Ö=Mýß¸Í^¢²AB°ÂbûOð0ÂBL%°B°Ò¬;;SÀX±ÐÎ$Hµ·!0wïöòhã¼õ+Qd?½[I! ~~g î?zívïovðT¦ï§~Â*ÎBT<Cº¤ò[-É"HiK¹zü¾­ÿìÓë4NQgìþ÷{ÁªnÌ*ß4æ¿H]ÙîÖ%IW¹cþgûLiíö¬jªð¬k+f[óò9Ù?&¦ÓfÓë¢A^ÑÉÙ¯wÚÎÎpJ$àâßà_·"¦Óê¯[Cãz¨Õ 9móòl÷ó3& /üûkÎí S.mºÒøª¤ÆëÐú\?Æ¶Î¨æ-+yÜ$+ZøÁµ×,vpnèÁ31iXÏ´pÄÓ½ªOV¼ô(8Ø±2±"1ê1NqÞñÁ#AO'1!aEá$ùøÛ6Ý,©â)îé¹VÞeâ.Ûâfô%ã
¦ér6u5·÷éZO5¸æÇ-^IEÁYØb³­ßìðÇb=M= Q1>Ù+[@BY&=MVñË÷;!.9Gå>W	¡S±XèfW±àâóM¡LÐÞÓcrÉÞZwTôÝmX2xc5ÄºQ2~HY¸=Mýkè]&Ùdéõá,ÝMW%Àf'¬Þ´ÐÎå[zLi?IpåJþ|À"®ç_Àl}¶å03%ÿ¶P+~<i¯"#q÷XüÜáú+íFqÓÙDé×Cu´ÞÏÅ°©(T]S¼iDèH/D6AÌkrHUC<²wÍÄ¡ù¨'#bjï¬Êÿ¨y¬ÓÐ®Ò34ÏA°¢¿¯Bp´rQ@
Ë4nª¨RÁÌ^K($>ÊÌ>Êo%Ä\@Ô¯XàÐÎE>Ñ×Ó(Øà0¶cm´îÓ«ä|c¸éQG$}Õã0Ü4SóÐzÅË¬Áp¶ÄW8Ý»xÇ.M°,µ,´[TÙÌÔçÔÝÊÔÕÄÔE«öÅÎxöNçQ»á=MÏ=MÄçmß3LØqP )³âFxH= AýëK ì»ÿZP@Y¿ZdÞùZÝÐÞt=}ì3°ö±}fÁé|ó·ÜÇ°´Á=MªÄ,'tÓitÇ0®¿hæ<K7  ÃÃi<<aKé\&ùgZf¸c5Ó8dr¨>
ÏZ,¡dS¶gº>s'q×åñÕ}Ý}×}ko/¿¿rÛ1õßUàÙ¾î-Índòw¯Öóïn4¾/ZÕøH}£Âs
Dêµ&JcR9rd2~Ì¸Itàù©¤Fdµ¼xK¤no´rQAÕåÖw±<÷±:w±9ït.è!ñV±0a±.W±-_1-[iø®Z4	æü¸ÊÈàQÌ&Í¤ÑO6²0T¸Â¤;µìÍZ°tÂ¤h8ÀºÞ²;*ÐíÑREÏB²À$ÏË§sÜ0T0Tò+Ï{ðD$FõÑÚøeÙQu=M¡ÊiÙKÁZmÎs£ÊºÝÕ§9Ó{è£ÇÀçàoÑ²Ô£À¼ä¢¬Íª±¤É²Ñ·§ÔTEÌÔhQÂÔÓÏVÔØ¥u­÷Åþ{qÿ¿¿±£ág7s¤pÎÙ¶%|$ùÂÈQ313*¬©8ÔÅÖU7¿i® ³ Ì=MqP¨²z"G¹6©KytÞË¶s¼qÿ®$N? ÑÇu{~<¬¶¶ZQârDbÁÄì»~/N*ÉËJoîª/'3d&ëy .& kÁ¯J9dâC-²°áTµ?¹Ü§9îs4/B»£w7W*@MþÄ¹HÑ_øsû.øthèú1Ñ¥?2( ¬XèPaâ0
ºÃx¡îºrrR9-Hz cør$Æèkgïx?"ªWoÛ*ð#ÂJ_¯fÆôC9:P<02 £$LDÎ?4&/ü­ªÁº3¿´Íæà1rQ£j6<îHûqiG= ø)¿¾òôÅQ<ÎUºÄx±ÄFûÇ#%l@º;Ä\ÐI4ØµÕõßÙå¤v2¤9Düìb=}fp]&&æ¯}ÀÐ&7¶&ÁÚÖ}ò_8=M[ì¨¼ ×¥Þ·m¼Ú/Â)ËðêæJ¶CùW=Mï¢V´"Õô-¦w2Sil/Ñf³iº.1:B8FOJ
PVuô=Më2= æ= s´7±7ÓXõ?¦-9¦ím-7æé¬ºÅ ÀÑÍçþ¦øñµsÅßYGÕµûHp¹»°EÝ{jëÿéJìnðÈd±Ã Ñ½CçÔ¡17,np¡2KÀÕÂÉ¨G3^0P>àÖGÇYÕ¬n0)FjD!ý,@ëïåòbñÔ;³ñ6£lmð©Å26jbÁ~Àð-Ô\­ø9Kc?Ã¦A£î©Ô@	K<UqKÜ¨)¾![	g^-Ã_ptõÉEÒ¡pHm1éË:$êJ,S£&<møo¼>e²®
¿}O'9ÀóBO(¸wSd±>1vÐ,Ñ] ÍÂLB°B°B°B°BP·Âcj«sÀô½<;*u/
&H1À(|EÝ§&ÞÌ£÷gßBL	Ü§ÎË>&òyXñëh¼Gªe÷çÓ27ÈzÊO¾Ø
¬5"¬'b1ó¸y¡Òô¶+#È\é¾ëã8xÐ~Þ>óùÇ§¢i·SyðfßI2 ¤h~:Ôôi2Æ]­èÎªâ¬Pdq$+ÑÑ= øo½Í§OMLM´ÁÌ¬ÉsS(Tb¬Q¡¤s$kPkIîlylgªÎ|ÊZ= 7yÜFÚ]*= Ð°v±¹Qc!PÄÌ®jg©ÉðÅ¿ÐLuØ¼£¿}Y|ÅSI»M«­bMQªTxD©&8r&ôÎ¿QÈ Eà£rÅ¯HÞBô¹)¼0 ºÀLîpRq)gç9.³mGÊV= Åõ«
]²µaaÕKáÞfÌÏ) ¸Çã­%íBÕZK1n±GBHðHÜ¾x»ïï-­m;¡bÂ n¾ü5ù§áOÛë×>ï' ëø8&&B6=MekÇrC;Þ'L{Èópe[öµ0¬º2y¼MkbÓÚ~²Oýðdª&v1\Éâh²sZ¢½ï&r´ô×«÷ò\Éãh-ï¤²d
Cl~é
ó¡	Ê²<mÞ¦XmrfwÞ'ø+-@bº*2mÄFÈMð¾ó»ËÐ'æ~ö(±Û>$P£O= #*¸Íç~Løâµí{?>¯t8N_Re¥ÈLoÓs¼àsyD/Â´ÍaíÂkßaOh´hoq"y½UI	P,ôÇLP³u¸­ÊÏqÇe¯F<©¿,sµýyHúÃeS¶ãytfó¼
ÎîózâÀóÒGÏiøÌøÎÞ¾ß¯hôî/JÎøG´ÙGÛôÎÃæ1cÉß¯Ä\t¶ÍEÅç§ôÑv]{ãôÍSî³rl2n#º;KOf¯!©Ñy2\ðeæTÞz÷ÓÐé¾û#ÆQì §bvÕõj»Î±3gÀcìæ¯ÞaS¤>ÛÓÂaJmX}c
)'ÅôÖÒÀUFÎËÃy±¢Éc¯/ÚØú+÷ºm[J>øøkB¡/#$yø-ë¨>[ËóS'[pæÈs¤R6¡TðxìÈñ§oJß²eÃø)GVR ÷yÀÍû%Ô§oävÄ$»ò£ÈJ94 ù;ÿ=Mà­ä>âîÏ,:a<¾@Ûîäíª^âyHnlÇNpGd°ü¬¡¥Ä@cmÑAy_¡[Æaª)¾|î]IãDf¶3¿l§-ù²\ß	O_csP	§ªLT³!¯Æ<øÊ¸Ì%ÓÚºbÊ&|üÎâ¾,xñîÏz_o&Â~dÉÛt³qj\ÔxMWCÎa¬fËñ¥ñ%ä~
' ÃE#N¶FdObáÂæFö¡¼xÒPCÌ=}xò¾8cE#ôn&õ2£ áª±)¨Q]ÉÖî´gô#EÃ£= NöÓ!>y¼©hÀ^]ÂÍÎÂØN´z=M¡Ø;Ö±¢Á°}Yn/C¹°ÚíÐ+TÎDÐX8hÐäRJ_´¥ÓYÔáÐðj±´4ÎôÀÔÃ	*È¨où\)uÈÃgB®¿oð¶Æ3Ëñðb¬âýÂ¨À-¤N9½0 ¥¥¸mp£÷§ÝÁé¡ý= fkÍ; ÒaóáÌÌ	{§÷Ë«VþÔ¢ígiÐîz@Íþ÷­d	/¢ázÓë~ðàÆaÇã§ùÃ/¬S'(õ¢äÛ8$+ÏáÒ4f#
¿!è;üKºs¿ý»çðe¤×Â
åäTn=M5È)ÅM@R0ÅùüGjÊ0+À¤NWEö	!±
=}ïâE.¿@S­°¡¥sþ{³»f=}¼ü´bêg4­= áÒÊEªï P³|<ÇP°îÅè«Q5$¨¢)w¶ËµU,Nad8©î1BÑ½À7SÝÒÔýmõ4ÔôzáJ±ÐØyÌ²L4»æaTk{¼²ÖÓ²Oïä(°3Ý"»Ñb+9¼EÿF³øHÕgôQÕÖÓoØy¥Óm³â5ÑîÛúmþ,ÒD6Ò$e³âé¸´ÉÔm±0ïZÔÞÎ0ÁÂ$íTdYQ×È­L¨»c­>PkªË¢-}bgÿ.cWæMYî¿æáq>KÖ 7Ä¯YHDuËàOýÄ÷ßDNØ&ä}{QÂé·
6×àÑ¤|×Ûø2 l-|Î"NÛ>÷ÈÝäµÄH®l8(YÌÖ>46#oÒ³TK_ ÎTÌÝÜSávÓCò¢ªT'Ó<ÁÅÒ_ÇñòÉºy´ßS Ø
2 º«Q 6d&Ã´_©Ê?ÍÌ²üÍ¡´´([ÌØXBN<4¥Û¤p1òKÒh#³haæQ×õ¤äôòHÖ»Ö}|'ºaTÀT5ÔÁÂÔ&ÒLd®¶8É¼JÆ]È=M²qÕMeM¤ÞÚÍÉÄHCÊ^´¿>äå1(Ò³§*àã}VªÔb%OÈ(K¹4ÒEyÞÔÆÃ ôÒgÆ¤±D&Þ~×êiu!Mj7;®ÇÍâWì|	çês^:ýònlwyHþó)é~ÝÕxÿë&z÷q4E4EbÚ,jW?ÒÚ,jW Ð2Ô.áàUõáÚßs²°"x¹yÂ6Øë÷2WZ"Gwý:åÿ5 \L0ïÁo§âÓ± 8éÏtcÚÐDv^öösï= ¨wðÈÏQSÞà¼óë0Tgªio.Þ¿# M;u Ï!Íÿ qu|QpÐèÐHÍîÌè½<Gº glòi,ì©­Ãj
Ñ"$÷¦t´QâoÓJ^>lj^ÒFqÄ\è.b@«/Q
ú(Ñíô7j@?¸Ý¯»u,»´:õÇxaEò/0WØà&Ãß¼2±1Ën25ÑÁdqß·[uþV¯MªÑàÆ´áí+VøöóÓ[À°Ò=MÙ¹ø+kp÷ûQC5léÓ£¤]Ó²atçz[¸ÓZg\ëZ_t^Lkÿ7s ¬ÐËGsò:ts= °ÎZ­F¸z¨ÕÇÝ>½f÷-f­*g_àf¥6ûÍ¶²6î÷&\¹<Cù1Åú
P2éØ¼öF½J×ëCRñ<a]¥üÇ¬ðvÆkmh.1£ ìKÄ-áÈ=}t=Mð; ÑàÀNËYîpf=Mëä¤ïë.zvÍ®ldNÐ>¹UÇÙ!3õ±Éorï"	ÙÆAfÙçtN¨U§è{ñfÑI£b:ä× Ås>cÌæIt²§$»R¾5²Û{°ü[{­p*&÷g¼6abÃ5= üàÐºáSÒ£²U²ñQrX!Ú2NºÙÓ®×ðá +(+aÁß¢×nÎ­Z¦ ÙnûW·2Ñ*wdXàõ§àùù¬T5ÍºIò73Ú\Sõu®¢´Â3Ñ)xÞWY%E-è®Þänheê®iÀâÿ*&c[cñ^d|Îýi4¹ä¶â½ÑÆk;4\1·ÂhYþ1·¡LÜ!"jïsÅ9A÷äEÍ]Vû_1ìüÐÙ×êk§P)âÎHmNÙð°÷Ò8ü@¸¤HÉ¨G3v¬ï|J±®e=}gÉÅIÐ+üKµç²ðM56 x{þ¯ûx=MºÀ^¶)ÈFnc·ËÑOa"\4O\èhûéõªB\uÊ 29Éëg
¿Î¿1¾Sæ«,h= Kgi+ùgùXÈDÂ(À= Éfac¡:1ÝrÇ\5q\81d: ÿ
OH0ÀçOö!ÆÞ|^õ	óßùÂè¸p
å'.£3ðÁËß;Ïaõ{R¶U¬2¿ÔæªÈ¨­ú¿aNiå;º.Ç¢5Kã¤Óm=M´'P}4iMQl6¾Â¡Ùâú{[¡7OHDìGÌÐòËp^8vÖeDI^&/³!=}À6KÕcß6}úd8Ç×ö?_Ë¥ò)!>§jæx'=M:çW=}©¡wÞ¼U+AÒ)rpÞ	àþÅô5Ç5òkÛ«Qôh[yjNÒlËÒîñ Â÷nÙNØOí2w©t \fí¤\GºÙ¾Sõçzþ¤7*¤ßwmy
b,´î,Ô¦Í_ñv	OÜr³§Ïâ÷ÁybMÀ!qNGÌ°:ÝÝ uýÚtJJÉo±u©= ïÔã@D$oñÔ=}'Ê~±3ãL¯ó!Æ=}ù:g®½º²íq¸|·Àûz=}h6µÊÆ¢ò»ÈÖâv¾J](#átÓìço¸&©ÜXqÑIlHc#Y¯}ve\h¬ö´¡øîko¹Ævÿ¹ ¨!ùíHµðDÅµ/¡<ø8Äãn}ZBø­7}l>ýìøµ9_^ÑP#Ìæêjîtë¬ÐåÃ2Ì]Ô ZxÝ©k6HºâëZÆÅ«H¹!ûg± aG±Htå&4Wã:Ó9Ò39âåå$³aÈEgúìJ×r°²éã (FÊ2m£t9¹2«Sðy7®1ðnA3Ä!¬x%{íÙo8(ÙÃ¸zïWæñCÉ¶F(ÿNÐo]FãÙ± ¹Óèï8³µ)déFPÛÎ¯ î°µ ¿ßãÅÁL¿µ;®Y:âß3ÿ:¼àÁ³j¥+ü{Ïæ2X¶(sºI¸é)wÞ(Ê(ì·¨ãT¶¨#ëjFÅiÅ¬V=M®º³Eþ¸àE_§ØÿrwNj§îËÉ+öÎ0þd8 Dô!¶=}»çÄ¼=}bô(YyÎ(Ió«öaeé»ÏF<[\H/²\T¬ßµtnÆzöé7>Lÿ÷yno-øg8(}m!4îãï¯lL/eVM	zW¶ðM¨
.â³ÏÈº[g¸=}ÒÆé®jdf(Jv@Ô·¤v^áCC#â°h$þUò= ÿeAõÉêhÀ%Kvk°ôBÅqbiîájL÷0»Ò<hßïÌÂ»AÙëA<ÙDa®¿2b»Iïä;#øLD%Oâ4(PÑ¬K¹®<ÕxQÍ¸ã= i&"/Y"EØ[t¸!j$æArçm§R·3$C¡ó¶Nû[3wÔ~àXó·O7ØlìwRV[[c¢2S3B;´à(1B÷!c6¤kt.a#{öq%Ü³ÍÐ\@-}¢a</îúÑÝî-£ÈWç{j)(Ðã@ Q=Mz<£ôâyÔÝ6®>ySJ OëONÁÔ· AÆP©'3É¯Íúýä° .êQtñCB¦×bY\]æ î_BjÙèüxTRÖplF½YÚóC= nkv!Ì.ÙbRþ,z=M½6i­+'Ïè=M¦Ñ_= b;Ý dy-Ò³CG¹ø?Vfó\X·3«]ÄVê´N[à2[a­: 6I³:ÒmPaOø]Õp*0B°B°B#B°8)°0°O¤NKÍò×Ç$éSõí cë.Åª:!4ûQ,þ"lÊÃÞÉÍ
Â§ 2 ç<²©¡¤»º,ýO¨õãÝáßãÞâàd]a_c^b= $i:GZ'Ê8ÒÔMôU¼f¬§7çþFx h7öáhüï½\e%òö(O]
0Ý¾?áö,±-Á bowÏ±üáa¡û|ÂÒó] Ñ£¼ì>»= È=}¿[î$d|}èEcÞ®§dIÐªFÔ|=}$£oúøÌ=MvÒv[ÆLûóx@ÉÞaàGÇ*ã¼M6:%P:úÜ­¯:!eI­ö*QQÀÂ¨·¶¬Ñ0¾ðÒA:)K}â²,:r";Zf=M-Ì^b¼¦LÔBÈûàGdPuÁ+$³pC!~ktFô«â",7CÂEÈ>§>¹Ìµ½ÊÂÎ×OñÙ ~ªdAØ^
L¯GÇdXB=MP²Û´¹ÙÈY|v/s·ÃÈDÓË à¢Qó×ïº²è²¿ý°®G²(É®âC¤{xC&¨ïøÓÂì«þ0-Ö(®M{åé_%=M_fýßxíé= 3ûãøæ^Wy[¹Vitaü=M3Ê;ÏXÆo¸ÌMÒÜÀðÓd¼fÐ×-gÊØ!­;(«|P­ùÀUÂÕöÈûùÀ6G|Ï×`});

  var UTF8Decoder = new TextDecoder("utf8");

  function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
   var endIdx = idx + maxBytesToRead;
   var endPtr = idx;
   while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
   return UTF8Decoder.decode(heapOrArray.buffer ? heapOrArray.subarray(idx, endPtr) : new Uint8Array(heapOrArray.slice(idx, endPtr)));
  }

  var HEAPU8, HEAPU32, wasmMemory, buffer;

  function updateGlobalBufferAndViews(b) {
   buffer = b;
   HEAPU8 = new Uint8Array(b);
   HEAPU32 = new Uint32Array(b);
  }

  function _INT123_compat_close() {
   err("missing function: INT123_compat_close");
   abort(-1);
  }

  function _emscripten_memcpy_big(dest, src, num) {
   HEAPU8.copyWithin(dest, src, src + num);
  }

  function abortOnCannotGrowMemory(requestedSize) {
   abort("OOM");
  }

  function _emscripten_resize_heap(requestedSize) {
   HEAPU8.length;
   requestedSize = requestedSize >>> 0;
   abortOnCannotGrowMemory();
  }

  function _fd_close(fd) {
   return 52;
  }

  function _fd_read(fd, iov, iovcnt, pnum) {
   return 52;
  }

  function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
   return 70;
  }

  var printCharBuffers = [ null, [], [] ];

  function printChar(stream, curr) {
   var buffer = printCharBuffers[stream];
   if (curr === 0 || curr === 10) {
    (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
    buffer.length = 0;
   } else {
    buffer.push(curr);
   }
  }

  function _fd_write(fd, iov, iovcnt, pnum) {
   var num = 0;
   for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[iov >> 2];
    var len = HEAPU32[iov + 4 >> 2];
    iov += 8;
    for (var j = 0; j < len; j++) {
     printChar(fd, HEAPU8[ptr + j]);
    }
    num += len;
   }
   HEAPU32[pnum >> 2] = num;
   return 0;
  }

  var asmLibraryArg = {
   "a": _INT123_compat_close,
   "b": _emscripten_memcpy_big,
   "f": _emscripten_resize_heap,
   "d": _fd_close,
   "c": _fd_read,
   "g": _fd_seek,
   "e": _fd_write
  };

  function initRuntime(asm) {
   asm["i"]();
  }

  var imports = {
   "a": asmLibraryArg
  };

  var _free, _malloc, _mpeg_frame_decoder_create, _mpeg_decode_interleaved, _mpeg_frame_decoder_destroy;


  this.setModule = (data) => {
    WASMAudioDecoderCommon.setModule(EmscriptenWASM, data);
  };

  this.getModule = () =>
    WASMAudioDecoderCommon.getModule(EmscriptenWASM);

  this.instantiate = () => {
    this.getModule().then((wasm) => WebAssembly.instantiate(wasm, imports)).then((instance) => {
      var asm = instance.exports;
   _free = asm["j"];
   _malloc = asm["k"];
   _mpeg_frame_decoder_create = asm["l"];
   _mpeg_decode_interleaved = asm["m"];
   _mpeg_frame_decoder_destroy = asm["n"];
   wasmMemory = asm["h"];
   updateGlobalBufferAndViews(wasmMemory.buffer);
   initRuntime(asm);
   ready();
  });

  this.ready = new Promise(resolve => {
   ready = resolve;
  }).then(() => {
   this.HEAP = buffer;
   this._malloc = _malloc;
   this._free = _free;
   this._mpeg_frame_decoder_create = _mpeg_frame_decoder_create;
   this._mpeg_decode_interleaved = _mpeg_decode_interleaved;
   this._mpeg_frame_decoder_destroy = _mpeg_frame_decoder_destroy;
  });
  return this;
  };}

  function MPEGDecoder(options = {}) {
    // injects dependencies when running as a web worker
    // async
    this._init = () => {
      return new this._WASMAudioDecoderCommon(this)
        .instantiate()
        .then((common) => {
          this._common = common;

          this._sampleRate = 0;

          this._decodedBytes = this._common.allocateTypedArray(1, Uint32Array);
          this._sampleRateBytes = this._common.allocateTypedArray(1, Uint32Array);

          this._decoder = this._common.wasm._mpeg_frame_decoder_create();
        });
    };

    Object.defineProperty(this, "ready", {
      enumerable: true,
      get: () => this._ready,
    });

    // async
    this.reset = () => {
      this.free();
      return this._init();
    };

    this.free = () => {
      this._common.wasm._mpeg_frame_decoder_destroy(this._decoder);
      this._common.wasm._free(this._decoder);

      this._common.free();
    };

    this._decode = (data, decodeInterval) => {
      if (!(data instanceof Uint8Array))
        throw Error(
          "Data to decode must be Uint8Array. Instead got " + typeof data
        );

      this._input.buf.set(data);
      this._decodedBytes.buf[0] = 0;

      const samplesDecoded = this._common.wasm._mpeg_decode_interleaved(
        this._decoder,
        this._input.ptr,
        data.length,
        this._decodedBytes.ptr,
        decodeInterval,
        this._output.ptr,
        this._outputChannelSize,
        this._sampleRateBytes.ptr
      );

      this._sampleRate = this._sampleRateBytes.buf[0];

      return this._WASMAudioDecoderCommon.getDecodedAudio(
        [
          this._output.buf.slice(0, samplesDecoded),
          this._output.buf.slice(
            this._outputChannelSize,
            this._outputChannelSize + samplesDecoded
          ),
        ],
        samplesDecoded,
        this._sampleRate
      );
    };

    this.decode = (data) => {
      let output = [],
        samples = 0,
        offset = 0;

      for (; offset < data.length; offset += this._decodedBytes.buf[0]) {
        const decoded = this._decode(
          data.subarray(offset, offset + this._input.len),
          48
        );

        output.push(decoded.channelData);
        samples += decoded.samplesDecoded;
      }

      return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
        output,
        2,
        samples,
        this._sampleRate
      );
    };

    this.decodeFrame = (mpegFrame) => {
      return this._decode(mpegFrame, mpegFrame.length);
    };

    this.decodeFrames = (mpegFrames) => {
      let output = [],
        samples = 0,
        i = 0;

      while (i < mpegFrames.length) {
        const decoded = this.decodeFrame(mpegFrames[i++]);

        output.push(decoded.channelData);
        samples += decoded.samplesDecoded;
      }

      return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
        output,
        2,
        samples,
        this._sampleRate
      );
    };

    // constructor

    // injects dependencies when running as a web worker
    this._isWebWorker = MPEGDecoder.isWebWorker;
    this._WASMAudioDecoderCommon =
      MPEGDecoder.WASMAudioDecoderCommon || WASMAudioDecoderCommon;
    this._EmscriptenWASM = MPEGDecoder.EmscriptenWASM || EmscriptenWASM;
    this._module = MPEGDecoder.module;

    this._inputSize = 2 ** 18;
    this._outputChannelSize = 1152 * 512;
    this._outputChannels = 2;

    this._ready = this._init();

    return this;
  }

  class MPEGDecoderWebWorker extends WASMAudioDecoderWorker {
    constructor(options) {
      super(options, "mpg123-decoder", MPEGDecoder, EmscriptenWASM);
    }

    async decode(data) {
      return this._postToDecoder("decode", data);
    }

    async decodeFrame(data) {
      return this._postToDecoder("decodeFrame", data);
    }

    async decodeFrames(data) {
      return this._postToDecoder("decodeFrames", data);
    }
  }

  exports.MPEGDecoder = MPEGDecoder;
  exports.MPEGDecoderWebWorker = MPEGDecoderWebWorker;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
