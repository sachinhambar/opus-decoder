(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('web-worker')) :
  typeof define === 'function' && define.amd ? define(['exports', 'web-worker'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["opus-decoder"] = {}, global.Worker));
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

  if (!EmscriptenWASM.wasm) Object.defineProperty(EmscriptenWASM, "wasm", {get: () => String.raw`dynEncode0080üÅ]Æ ÚXoICãöÉ°lpk°cL$°ü¦üo;ð2M®[:>'ð*~BêA	×6p\ûz{c.W¸NÑb= Á³Ìúæª=MR¹8^Ò¨V=}oÚr<j=}w,>÷\Û	zâ4­µÒã%RH{~ö´ál²nN:ÌfZcp/rä' Ôf3ç = ä@§@ñ
@®ßLpÒ5ÌÅÎ°¸ØÙÍÊTØÎ
éÒ¢ºÄD @¹ÇÜé
YZznàO$ð®A±Q\Ox³Îl±ü{kgd3ºG³øN= ¹¸ga Þ óXAù\Ã8Ð~x9hû!ðQ½mæÂ¤0K«Ó×³Åg«ßúPMCÈ &ú!¿1ªÞð à@.Æ¡ÕåÓµwZ	C;¯µ®üjÐ?3.Éu8 ¥°ò­¹#<%\èRRDè!%#Öö74[èÿË{=M$¥±ZèéChJ.´:6%ë=MîìiÆ#ÛÛ:UhèËÇ=Mnêi®A°[,ÑÈÕÃ¼¹ÈCni©~åwÜ<ÕgEA½z'ëlMF½~·é÷QÀÆüp_×oõ=MpC±|shú=})Þ/%ö!= ºÄfÕ6ZR¼'óRÚÉ·uÜ¤Ø¸¬d?¦$æÎÁ DeÁb»@Í³±p#s Â!@Ö"±±Ù}îtfM@¯µ¼4?QÆoÆê9YªâÒîJ\BÊ±ñO8[T
)ÓÍÞKÖÆZ½Rþ£	»þ©lþ9aMXãgN¦üa]&Ìe&ÀKÄÄË:Ã[4|]HñÚR0M>^= #=Mý	BC<¢
ÓÃè_°¡Kj%Þ¸@ã±D)qmá.ÝHnD!ìF÷TÔaÕúÇø.Sy¬r¯Õnt&}¦}áPëéø£Û/©<ÓM~o×°üð¶+RñÕÕníÖéÒÕÅ×{ZÔÓ¯¬ü¥ÍAöCýíßº= ÷F=}¼£Kÿ:ç&+Çê´2"	×5EK³36¹pg±ãO¬Hüù·oü7LGLLLd{}jut·ÿ:*+?×/ÞUô¶ðrÇq±a<2øÎ,Á4EZBË@Ú­{Oûb!Á!0å¿Öa0ò%=MÓÏ¤gèO¦ºÈ= XÛ{uÚPo©ânúUßÔiÄ³O¥~â )÷Px_iÌë®)T~·º5mA3Éí.z»ÛãÔÄ ¯Þ<xFÏìÀHf^5£é¦üxÊ&ªk½À­çÊ³*w´¨°óW]ç%PÕk$¿û"ó >²úÖò³Þ3¯	°Ç×µB¸¶?Å}0bÖíä7ÍÕX¦E³t]¢Ùõ;0ïhc6´¡°vqÀ³ØSnW¢ôåAÇ['¹þöï	mÓ{>¤Ì»Õï=MRãTAJ°Ê= C<9¥¤;ðï2Ó­Ã}+?8m?k®ñtû;ÍDO[Â:¹]2{Bà0ëÍüÁ»îrÊº­WÅ±­?YKLÐ 0cb/3£Øá¼^D¯íZ¥´®!;¨ËM^8ÈÌ¨DGÁæ6ÆÓ&ÝÉ ø^áLzxÂíîÊ9ÕÅê}+A%CÌæ WaiÁ|"kÀÎÀòéÀó=})«á«?Ø{×ìÏÜ=}èH3Çß@s¬Q5&[Ì= ýê«Ìô±R;^ÔºõØ)^*P½÷n= ~À{÷[åF·,Ä>Áþå÷pv»êëÚî6"«H=MØ H¤[%çå;tBX¢9TXEÃHqÌöëMiáo0%~psMcêW¥U D®(9Ø9l»]¢6á@¢xK¡ÀÛÎ\áé}k©ÖSD¿x¿àsæÁ ±-õBÔÕrO#6ñfÊ'pØO»þoqíÛ= M¼µûêIlAÎe:gb	º:&ax«%&âÑ&MøÂùúÈØÔ°_7éûèrZBdZîM©àOVKUÚßlÉD²÷Æ±z>BökbIWuenHocÑãbroõhxóvÍL.DeÞvéXåb±óläè:,Ø±XE@UÕe<Míóûsíy-äSç7:_u+ãÊr¨çWcbcCxHUÓTú£jT.¯ýØ§$ïâÃÚjóÆkÐm¡ÒÌ$iò¿fÉôâ36PÒtL6lðâÐÕÆî<6fèM¬$ÇºÜ-+õ
 #q1ó&9QãgÃ¸BA¦»â[{;BöYìÊ©bÍ#q×.ôðRáo»4ÏÖ	$]	MI¿®t©êzkö¥]69Q¸¾_qùà2"½2!CRáJ	«é]êÈ­íHÿ¨ãc:=}M±h¼1xòpQ¶Í&Ü!I¾ÖÝÔÕ¬|é§ÉÂÁ«æzÛãIë=  »¢î¤EîÕQV;»7ýîjÊ¥Ó}ìªÄK¦ïYQY3Æåõ>Y£ÃhêUÛT³lëÜu³NÔGÜÎ\AâCÎêìßvµé6ï=MCÜjá&½´Y6OO#mÞÄ1ÝîÀÚ2BÎÖ²sÍnG:¹ôõ´¾ô²,Þ¬Å [pX=}±k¾bòu2EBÖ°w&V´Ú*5lTÇÆÃôdÒV¬æ%VQëemó5ÛAüÇ¸â¶¶BÍ¤Ý¥»ê³ÍÞB|¼¤_s= û^}p}äôqT#}4ÏyðxÏÙ¦~JkU46FLÉ½*Ä:_,¾slþðn·b/uÕ¯¤}ÐÊb.y<·8Wj1'ïÿHmb§á®i}û\
,Ü"VWHJgIj¥;ª	 É¤2BÕjÓ%>*k.¦ÖP-#¼)ÉøÚ» ¶x ª¯]æÚm$ÄÓ±h÷I-d:ªcËK«Ü¸+Wô{åg9}dÜÙÐÃ ^þHöýB4P¸æ	ÚPÌ¤U*Àã8<=M	®é¬©9Àúà²ÒiÖTÖêÚÇÌÀs¥·È	ærø}TPýÜ= ²6|ÀÈ1T¬	d£@QC@ëôÃ¥ìÂ
	Ñz³o¢´ãc43,Çf]¤ÜdÒ¾lÑÛôý®M©ØÊàèA?-ù"Úsì¡¤Tµ,ÖÅ\q÷=Mæ,%AâÿóÀmØÔ×wH T,)DÌ³7y¦»Ðµ¥¼d(q¼¼1Ïb9òS°·0ö.4ÔeÉ.²Ü¢á,µýI?+P1¹yÖìrà§ldÝîyháJí?g9bÒFEâÃGÕ·Ø[²qó¡nÖR;'Î-À®ó*[áÈ¤ 7NÁp3Ýçÿ{êG×;ZõNÈN«5ì¢Y?¹0eß¨ªI¬<Cd iën!mÀû;üûâ07q)©=}ÅPÓ!sô= °IÏnE	19Ö¸"*ï]­j_Xçø÷Iã®
±µ!@jÉØ,
°XqZ Ó¨¼14KÃãl½ÍfÄk	ÂbÖ@Î«h%8Eü= 
écößóÀÀ´èÁ_ïê¬Â3õý\r2NM³hCG­ù5Ø/µø07ý½Aðg'SÚS´.µ[^MGÊ?ºlzXbmñÈùñó(cêWÈÏeQCR¯zÑ ßËºß^}ç ÒîÚÞø©P·wÅÝ=}kRÝí5î%«ãã«´Ý¯×ú@r$.M´W#¸³PåW.Ç'Dðudvª>7èæwo<×Þ÷q½Øi<>FÆÔ;xtNú;_	i´è)Îhr	®Ûb²!XE$¤õÃ(AU¿Ö X£àSKNj-ØZ¼-lc¹Ò]'^÷YôA¼I8©¢Ô+£µW%_EIÞ|éÍ äW¨XKàî^	tøSæ]Ða)á·O©.Èüpoû7^ù¶_ìåÊ|À.b }Oå/Y»ãhü(ÓNeçs5nCûxag8KP{l¾&'×á[å·BaMu·=}T]h;;nE_{V()\hcÝ;¦Z&ç}µ¯u])CÂD¿TW$C¨ü6ÿ47åRû E¬k©ÄFÙæ­@°{eý3ZIåùjºÜó<ËîÖ{"-7ÈRvBn ÿoI=M|[×£iæM¾ÃÜ&4,¥¤Q·è&¡whÖ5Ê¢KÄÌlê1~Ï2³Új"ç-¬ã¶ßÊÂµP®KzVC)¡ÛlÍìn¬U5+°xÑWjC-*àÊuÙ^Ú.ãÚ¢\X°ùÀÚÆmÑ=MV'vÁ=}LÊþÈ§79Û= ëÈËQ)I2,îã%åIlý³óõBØêOÜE¿¨×=MV.BtåP²lÃcM¨¦³kÌýTÒ>Ú"´ À¡>+)§³ÕL®ß!Û½÷ýéY-roX±g%5Ý¶'a= YEjðø~= ÿ©Ñ~6F¼]]: ?_­{Y1ðÓ:h¦åü¯	*k&~rý5mä·£è"mµ p(Ä'm>5îã(ê¬ØAÈ	?SØÏ"½Cò«Ü/Ëä?[ÜÌd.><AªÑ%t_ä'µÿá¨Þ1xË½lIbú|»'¤[$" ++ºFÈ8µtyFy/R¤çýÁ	Pï¹Óâ$4Hæ~{= ´QªâË[G¶ee´lbL Bi=}ûðæÝe3D£@ïì ö;.UK¥^ÿ^ÐIîÿåhÿ¨0Ó%¯ðjMä¡	ú=}ÞDß:39ÁÌDK¤%Õ.ïJJ§S[b¯5¶¢Ð.0Y¯Ï±±5&ÙWËÆ ¾Xùò¨£(á {E%ZÿÛÜ%ö= LìÅ³9¥xëõ	¡"_yMNÙàäd/|ÇÁÐÚÌ"mQ×ö~¹VNe=MªÃ"ÞiîEKî?ªF@Ò»= ¨¡Úù
ÐQYr4Ú%üî"tNÝ(}%">!Ày:Â­I¾ÜJøQ5z;ö5= <FüUõªÆ;k(ð;ÓE}®Tµ_±ÎÝBAzdmqgÓÆ÷I?DÛ/²D"Á ÎßÍÿ]|´¤éh¿S´('Óö£R¯Á~iÝ	­PÛ<î{®X3þa|Þ%íNLZÄâª9&µ^h<ã4ìôc= 6xÉÚµÇI¯ÃÔ#Ì.'/£Ç>èX[otú£ÿ_»c1?üReÉÉFò=}OO ½}LÐRSÒÄar²t_ô@¢ìJX¤W¿ÁF|c*ìÊ»_¶Â¢à1¶¡ÂÔ)ÅÑL]Óto"¥½J*xo"C<sæÁÛ\UùUmà= ³YÁ =}mç5?ã#¦9j!=}qtÜÎWvôÈÉî:t [ÒWøYµdÛäRSQï·4ÌÍSÅ3ÈþfZßyi^Ü±y]ÒcY,_^ÚY i¤P¢´Àé9ÿe¿Gï{´Aùn¸]Kh5ñ
<´;Rõä¬-Ó«CºDÍªå8ä}á­b#ª#ü*:¤¼¶{aL¼BèFN|ª;»Å|4yÿÕïÊ7'8©Oô¡+yÿÈZÔBÍ.¬3yó=}Å6%@´ pÝs>ä*	pÊKäûÎ}ÝÅóîZÈ/Ú­JVà¤%vòÛPôÌª52ÛêÓÑ@¬È+ãÂ&ÎÃ
¿ÿ±)+w3M@k°pÌÂX<³q-A"&zÀ"ÀOw¥QùïSa,¾(	Ö¯*TèDªg|SÄé¬÷"¹AµèkW]ÂVÜ;-¼óµþ·¤¢IbÆt³'î¯¦l{ÃÐïÄÜå¦WM*ÀMÜ*½2Ál~ ,® ïûñ3Qê.ë®^n´Cÿ¾cÃU®ÃþË>Ó¼õª¾j~UØ!ûöd¯V%
Î[y8ò>XÃJs= ¨<1_CèM/péÃ¯^ëVNÎ¶»jÅ7Éêlu3ê ¢É££eé9~<Æ{,0ýÙQH°0c½¥R)ÄÌ.ÉI­ÑÚ¾¶¡h3´t'/¾õ2¯½¹MDÛÑ??9òeÊ6MS6[ 0= õÒ1i³D\ËÛ}ÙuµH@fZbkF¥üW(6Ã4/Â~È9ÐO_ ³"ü^P µ=}ý= ¼åä
je
§«LI^¢L8\gØÎ@e5§däÂ'q-¶þõG/n:ÒA=}{ÿh±Ö¤#±ôà
G_^mF7Ôµ /¾»rõp^+N6]o£t2®_ñG¹7_ßääjÿnn2?üGç;I³M¤ÀdéæChI8l²±ôú)mõ067Ð-A$¿S8£0iÌb/kp= *º#_àO_úö	ÍlL½Ü6ÛæÚRÕ>@­#NÄx¼¯®7q$9ÒJ;SÈ,éÕ±uyîpÅÌã$6ëòÄÆ<,q©ð¸Ç¿sn®è$â(Ë3©ÕÇÙQ
¹Ë b]åÌþáÞOYý)$ÒÐa¦!õª3<Ü×-ióóÌ´C)´ó>£CÃn(ä®°Épý¼1G¤eµGÒLÈ<¬Ý®ÇYÔñÁQ¥=}}HáëH»o
Ú¹JZñ: àæì³ðÚãçívåÉ*~NøÓ§Ã¥ð­Ø:ã~´GJ^Ü@5õØÄC·ÝÊ ½*¥=}%J3Ye = ]VjþÊ= Ï'³Ñº°hPvÃ{#má9kºSy»àíõ7ö×$ RfØ²¾	Põ#y µªÔÏÈ¾A+Ç½ß&³A°1Sé¶ÚLY¤øRà¸µó. ½õ× J®mQ Ú¤&°óa­'¡º*å'±X>á$Ð=MØ©³=MY²BøYÔÃïÔ²¼7F³"j4Wã¡¸ZàÔ¢½"´pMÜKùßC¿¬³z@¤¿Ó³ëëòáÂÝÝ] )uk! V)oû÷õ^·"z· ctâÞ1FásmÉßíW~A»ØSò0¬$ºÝ_¡ÍýüÞÿÊ4ÖòÐ
j0ÂW¨ÄRÔºJ¹Q>ÝHÙXO}Í7º¾CT·£qîãÌª1*tNÑ¯Åw]áÓ3ÐgÛSlÕÃÕl÷òý9³Í¶vÏv}eÜ21säæü×°cüIñå°:¯ = b.³5E+¤pÎCÂ°|ãlïíUØïÁÿc¢¿f©¡åCJ¢¬í1Ô<ké­·ÔKMo/PiçÎ f?ª=M¡i\ü²eöJ~{é«8Vá±Ð \o¾,agrãÊa·ó3}/ áiAªÜüb[L:ù­&¨kÔDp³*ÙÖ¦òQøï¶W÷;©"´¡^×);çµYa¢+7Ó÷âjÎÎü¹+áü¥^WQwoý> ·Ú~lq±o,\QoçÚ>7ÃcyÓ4´ü^ü2Þøª?ÀV	pùÞî5Lü\J¤¡±&_*w~æçj|-ÿxÝÝå¤A¶¹-+ú¦ÁrjV|eÎU3§*l¬5=}¡X[ÄññXîÀJÍøc¸$w6ÝûÁ¡±76l5ßêûÐzGáû¤^cóGø×¶fïNÚHÄ¨qcÌ¾Vd,÷ÞÔå¯õéú<Ø°ß¿¿rÌ	UÔrÐ G$h;(¹S)¤5$øG¨»R0ÌØ³¹ÞÆé^¯°¿kwm¥C6éøæ»Ú¦døùèì,ðOÂèê]ñ©vÑ¨rtò	jÝª°ïuD?¹ *_ËK¹ÍËÒ=}!%|[¤y6§ÎøU·zÏ\&ÚÝeÚ;è­%0HÐ½Ð³ÌÛ­}c>Ð­Ó¿(ÕQÐT©¤õÂsYEÑeÕô;Î}ÐJ³g±É&µÓF/Õ®L»3_Ë´mVý= M"ç9£È/è#¬ÄóÇü¤| ~cPÜ;#ãÄxL!Kt¼ÏxÃ×¬ë¨§óX»8¿M°¼£Wí§ãGYæðu[áà¸/õÿóÑKa¶h¦økÍSÁ%/àò1X¢¥KEÕÀ¶"×Å®UQ6¾ê;=}MÁüXßgí,éñ^cOAJ	PIª[É%£C)ÔøÉ ÛÂPdôs)ÖBø&!Igr^}[S@B+ã@¼ÿàéÒQ,J×¹¾}uìRòçmó\¾Qü2y¨;Df£ìEfCìFz¼Ð~6=}Î¶øhÒI&3õ)Ì¹Nº+ùâ¶ÝM&óVõ¶?Jô:ì'åXÎ#[Ì×m´PÎ+½3½ÜJó´l)'ÉÌbï0Í\#v3:µl£ÌSÜÉÁ}1¯;ëxmÁ#[£òÂ¿öÄóH¦ìî0ÛlûBÎndZ=Mh ýM5öM½GæU¾LæEà3ìÏ2Z;XÔvî¶v¶%=}Íáoã[{Y$v¶½kYDv=}ÖÂ;òmeæò<Ð¿+]?:¡aÎAÃº%ÐËvÓôôXk°ÐÎ:°wÀ»îK¸ü#»ÃÙ÷án>ö]°\øïkÆôç¨"®>'Ã×ÃC÷ÏYa°:³ÕfnêgPeÍNz»¶#>ârF2Öº¹45RIÞ%t4tPMºwð»nì®W9óm:39Ní5óhNfººwÐ».JïtkE÷\ûní¶G¨*¹&ß¢U_q&MKø£ãä#æëÎ¹öãFeÜb8ü°i1Î×@À üþúV|úÁ×.üJf"= fá«q³[VBP®Ý5J@¿#ßm2è<ù[»Ù§xñ-¶q	ø3y Åd0oÔçu£(KB¿àWß|i I×a"j,QMäÖÎ@E¡wnV:ÉÖ¥cî@£KÂxßÒ­ô=M»Àv¼ü{G¦»âuÿ%/c7E¿¦¬3ÿWëó;ïÏ;,½eú¯PnØ©?ðb²®èIC!¸9= ÿcJÿSv= öGh³óN°wbfÐ³8¤Á¤¡"¨éÀÁ
ÀP¹go/\Ä\5£ôùu¬çý|½vjóW÷é¯mO¹g8A¹Jb{*i®ø¥zwLÌGjjjnjj*j@O9ü×iXh:=}°æí:Q¨«ÔæplIä$±\ê3ÎÊïÐß²ßêCÕtU¤á®ü&¾e'Ø\à,ä¾EÐUé	Æ%ãì;~®Å]ä³S¬Úêe)H[ýc&Î·xEfÖ¸Úz®¦d¬SýoÞU¶ôt4úZ1dÔ'És»Øk
Bó¹L&x}F¢v¶RG{JQL¢Ü¥äiKQ× øÈÙNõ«òÆfãDÔÐ¬=M.ÍÚÜÁMAéið¬+¢Ôîå§ðYÖÜ3'²À·7´c»-÷JZÈG×~@1á.éüÝ>µ"_¢M» på§T/MäGOªÉA^¢æ¤k²Ö3ëó±o³R?XDçö@=}l ç= ÃÞÆðÒ*¿F8]vÌGe &Jðq$äkííþ¤SeøÑñ¹ÎxX¬»ü­³¾©w~Ü
oeãÿùe}ü,p1Ò¾HGÒÙs1Ød#¨wsQ¯üôKyhüäe¡¾ÚeÍü8r Ñù£ÁùÊÏ-ÿe­2¥V¡x°¡³öìÔ-ò±®
síáéîÙÙÎ×O<JE8O8W78¬®ãp!iLýèe­úS8=Mú|°=M$pj3-_C©Cuûô=M^¿I2ækwÉFM²ÙøzÀ:³uÒ%Wäjýuu$,BJúðÒÞýÜWbDaUGå÷¤/¾NÕûpv= ½¨üÌì¡6¥%6[CbÕ¹&kÝÇ»'Ý=M»MêKj.U8C°Û=MËTáÃcæÅh ¦Kòîln½ÈÊ³¼àÉ§;?¬§M2LØfWßO÷.MóMNô¶HÍ}þD^öñìÖíÀï£UF.©Láøirì
&úÊ¤.¯9>®vc}£²¹©æÊþsh2Ç3O$PíR¢6C^Î-OxÂ¹ñ¢Ä·hÏÛéRtñCì?ezIÒÏ;Ú£Á	dÛ¥Éî['Uk¨7ÄÖ!%
§XWIØß¨¢ÛT¸ÕZûÌRÛvÑ½×îió]~úïxf"Mr-ï\ÞhÅÈñcè¾¢¹&q¼ÞÄÇKÈî3Ì¡âÅæ¬fÔy²ef93Èeþ¹@æM)¿¥¼½$1~ýÝ9®>Ò+û!ÓMg0¿~Ã¼¿ ì2EÇB@º@T<JÖÉ´O«LS½ºf¹ªøKxVÅ$X9s¡	5kmDSåBr^·pyÜÒ®ûÑàbÅ= >ûÇÕYXÂ6¦ëÞÙ TåFUmWGf\sC#ãk¦)#6î5Þ[vÉ¢H"¹»ÅÁÐße{Ñ^,C£½YE.É0ö¯ò¨ç9óJ¯WO}¾¨¡éÖæ9ËÏþó÷@#=Mä¤+aLSdièZ¹híÑzJÎÔ,PÖÃÏõÔÏæOZØ»qäãÛ= ÝY/ó­íaÛOC4%	54ÎHÎÈ_·®´®wKÄÊ­¦>xvô~méÆNÏ¢V.\p°BãAb¹<^Üæ»¸Z!Cgf>yÙäFtcJC³*7 Ç7(ØáÚ¸!¼J¦iQ(c)J³r~&×UøhöÃú}Qø#]Àç+¸¿XhúÍ÷õfirotðÇÉõ J.= SfVö4xôÌ6NÇÌÓ°CªsúÁêº¶âÙ»qËÈ1éD=MÙçÈ#*S@ò:±î3r7#aS:Ì·¨äÝ¶ñ:Rª"¹Ý Îµ&UÞÿÓÂ²Õ§u%°ÕOäjmÚy:ÌÀúJÝëÔÕ³:å)ÅæfÀî¥ú2Ä}têÙõa^,i-MVáPæM]ÐIe-ådU\.½ö>ÁïÆNÛe¦sÀM¨»XRSFãÐíZH5j	­bWØ*Í%Îú2´*(wìç(6¥ý£×Y¬]¡ÿ¿mzúÁJz÷RÓC|!8Æ!8n°ål#òT£«ÓñuóÑ1ly¢ËÇh­'¥=Mf ôãìÂ!»áMå»bþÀ»Ý9axîÄÓ	(X;uvT¨f®µ~úõX=Móª+¶U(§qg¿Ôm^«Ø¥WòÜUÌ¯ÓÈk8ëÚÇÇKabvúkõhÓñãH[ÆeJ,ñ©ôwÝÀi!»ã6ã	ÐlÓ£ú9Ü»õ¿: ËÐKYk ï~tÔÖÆÅW¢Íé|Ít{´zwÆG³zÎ¹Þ&s25¡ú¢>E·¹,ùê8qÙ¨x5= ßæAÜU3©Ç@l1zKI¿<	¿üß/ØZºÄÙ¡gnùc]è<¯kAñãé}Ã³»wï 1ºõ Ôßë|¹<¨ÍFPH*¨à²Bï_ÚsV6ªSXÂúWð&(U Õ9ñÚ	ïm1GX ÈÖpzî­k<ÕÛ3çzÑ->\Ì,1M$;E+µ<èqÂ£Wx©1_xàµD  ïÓhXü÷(ûÖt'4(üµÅÈèÐ([ÅÁSÅ®î<t77è®ÑÎîUò«¾ò&jÕnqµ@Ò¨+T×Çj/=}©³Ó¤Å¾Ææ«(A»sðÄsÈØbWgÕâiMÓºM¥ ¡\ÃnDPìz!Ì¹9EÊ1Úrë³¦5wöU>dkÛ),g«Ë§ø¬qÜèÃÑÇª·£wbÃ7­_òâg{~_ï~K<}·xÇÅÐ42äDývÃe9¹h{ I9k £üùØF¶áR#tg&¶.ïêlCèx®Z¨rÀz<)pô:Üâ°Hbvá©"°ÖçÔ;	±ç¼Ú#-É|cªüÆ+®¶+ÈÝ«Öý	>§37PÜ«þä@kê®ÜþW< *ÝFc-*q8¦ô= fØhø«á
}sFi×~ç®êßëÝ±Æí¾TVâªªMH¥æfÎÃæÄùµç£®^;Zç¢±­¥º÷3ÏÑìÎëíý)&Öè%ãU¶E*@ñWøg&WbÚY¨&ÌÅw¦UÀ;ÇuÖ©¿vm= Fz¾ µ.àð¢I"»dÜÁó²,³VN¹¼²h¥°ÖùVËÙ²KPghÅN¬mqÎwü_ôi­+)Á¤©Ë;Þ¦ä$5Â÷8¨d!¬ÚÂæSfmH¾S[C4àtõ2¸ôÙFÓ8cØ8Ðüð¬Çþd*}ídZ®Æ$ìÙêh¼"V¶¤G³ÈîÙ´È<ý¦ °FÏÈ4ÛhÏêó=M8C÷}µÿ¡MBm¶þb%àTÕÃ¦|JÔÉ8=}´ñ#r7Ñc0°8hÎ8+sD){¿J?8x!Á¢e+E´cc>|Gè¡ßwüYeü¿vz$i²¯\·*«EÉõÇbÅ¦f»tËPükY)zxqÔ+§ÊÁÃÖÇDwª0êWÓÍKgÛ,J"~ýÑX:¦±ãZu¡LÆÕ
´jó³bNµÖÖåf5g¨ý®iT	[ÂàV(ûæ¼Äûº¨\ÖÆr²AÓÅWÄÒÅoH¡ùtl$.Dý!$#ñqöPéìàÀ#»±¢t¸@j¤Iúè¨«ý-kÁH«çU»ßý¤QÏÏcíêÛQød]WyFA×U+i£¿'Âú}S?^u4gõ7l1áYá FYfF8Wüá)ú½¸.×°¤½£,<FÆ{Úk¿ x#bÊtmßÞ%\(j~=}*ueåÝ%ÿ¾*¢ÊFbz'ÿ[¼ëPòy<×X½¶$¸Ö9Þª!9)r®Òy$¿ÇÂBf{ñfÕN%&aÄsq­£íò'§C¯Ç3§J7ÿE@§¥£f«g }¦ÚÏÔ¾ÚTz;{|ÙËUj½IQkN7{µº»4¢êga$±­ï%NÆ0AºÓG¥ñÍþr¤æ=}-Y®DÍBãgn¤·_#!+¬2Jü½¢?áõ98|G#°ÁGë§;1b+ò´Å'Æ/ïÁR§¥1TÛæ¬KºÀD«àc°= àC3RU·fP¶£ÞØB±ææú¯VLÑSÛTM$ô	ÁÑô=M2o(³ÀßÆ±û³Ð^ ½ë­ÑØ¥¢ì¯_\¬azïR÷ðrü¼ÌäÞ|V^WÇ:<¿xñÑg§ÏvNTOnüä\gSfy|"x1ëypÙ³© 1Gd S÷mM ÚdkM}ä,°©Ó'o.ü¸âô©(¼à¬TùÏÛ¶oéÌ¥å#º EKlUtÎ(uá[j¢p×í*EJiRÙçs´ùúÖ¹&½+Cò"ÚÚXúà¦Ï«<Ã°^Ó(&,´d{ëÒ¸L9Ú:¶BlÉÿØ6³Ù>ÚÐ¥ .Àðu= á=M7=d{Ã7*·ªokþMß®Í´²MtV<¢[Ñ¶zºkÑ*æ3øÂÂ´Y	²ûyÝ.ÿ:ü¡GAÇ?Òê@¨ïä(1ñÔ8â°ÊbJ»¥â'¦= Gñ¨c¸*ê½wt	ÎeËdÎéÑYeFr|<t ¬1Gh0÷[1KÓõõàöí±´+mÄzÛeúc¡ÎeVõ#ÙÈW<»ÕgÄp3¯ÔÏJ¹ùr³wÌd¹ã!ü)lG¿HËI65j®ÁºÂádñ¢%¹gSù	~¯fmlÆq5´12´Æ4îtLjÃ·yÜ#tMµ
To$²ÙW¤Ëj*¸ÎsBù©%_Âtiã[qÝ	ÝÙº:4{'îÿ(ºòÀõT kmäÆô$ÅÁ¬± ½"#@f|3ùjõÅÁ/´õFVÿ*ÒëÍÕs¯q÷åîóùðÄå»v8ü7-t0Cw ùúp ùyÑ^_âyjÓÖç6åúýõF±ßåÙ%­ *)´å%Wå<ÖU-éU-tçqVÄVê×ü¤ä£½tÈ|[ñL Q¤À¬Ô_3x>xP_ÚoÅ»Ð±~Ö;é@£,ü×ü.ùú»ï¾Dµ©ÒN¿tßpÀGùðNJ¡ÔÒµßóV#UùR¡-pæEf9y@£¡p<F÷×¹»ï3ÌÜHÇ7|¤¾2ryðe'pêäIiè
' ÏÏXÏs»rI$ü
¼9£¼5MzyrdìùÞÄÅgJ§e)rÜÃ@>OFv¤Y¼¶àø¾¯æ*[î&WÃ§©Úô¥q]ãÕºÛï$ÜX}rhKþ¹âYr[¼Ö
FS'tû}Û±ÓÚ	:ÂÍ¨ ~&0¸	Æv0o¾¼ª^Jzh{«¨³{zî{jæV)uqÔ>×·n&zÐ)°ðá5÷)ïö
Æ²é{¨ÁïªÊUÝ}>$ødta/§û8¿\¢>¼üQµ*/ãxþ§J*7h0O-¹)ºc'ÎA¯ÈÏÎ@¯¼ôWÝ÷½0sH¢g°©KxéBòéÁ(4/>Q>Cñøâ
a÷Ô?'½õ¤(7©HKÄÉ±¯O[^Ô |AÜàÆÔÂ³Æñ³ëKz&¦nAÍ³=MK$ÐûkGKTöwKCb
túà§¯áæbÕ{áuE4Û­±ê¨kò3/äíÓ×Ùúµ#·Í&cÍG¦#|ÚJ²b¤.NÔöQa{FQijBäí+´õÀþ ÝC¤¸dqrYP5Pæ ãx_t%_-H°@NñÊ)çÝ	aÎ-"2ñ1R¿áÖÐÖ¤OC@eª ­p#~±hîwXØë\ßS¸\áßÇ¼¶¾%ÕÈë&OâeÁ*6sùÍÈö)ª­dn%jÖYÂÈã¬¼Ä©fÈ0W¬#yx¼þ,É)ßä7jG¿:46n7µå¿M¥Aëc²tvÙ#ÊÅ[&³á¶ßÀmöùîR§gn9NÃÑÉê'èxfBµ^½O¼luI)ÀÑÐcFè²^,Q1ßÿò-ßM=}¥×yME"ii:ª]MÎ
BKÅ
lýoûÀ£e-p´®%©¾ÙRZdÉÑN)uÙ÷°xÅÓ¹ÁaðL.m³il¢Å?F0}âÂ}¼å-qÐ7|Vñ)óµ£9÷CóÌÐõ+q6¶ò},JVPs. çNÖà«+Õ \ß[G¬E¿?dQOk¤÷Ò¦»]qpÈKÃa(Ö^Wj+®´
§!!@ùéHì°èÈ×ÃîÁ¡]IèhjÐ(N½O²ïëÐÇú®ãO ëþE_ ÏzÈ}äé)Ò½u¼+ü¼eÓ!:'üªÍnürIÙc\èµß!5qhxr-Nìà¡= \l0JgU;V2tOÒÙ4VÃOß0Àr1)wËáë4G´eÇ#}f	LÎÏyû³+CKS}Ø}Âd8å¤½4ÅQâ¿;¥&zôîÒOÛdQgû_àÇ çQfkê/Â<IÆH< !äs¾gÝ	C~nÂDn¬­ïiÎg?7ÊDsÎ
EW¿ßáöà= c¤Ü\UÈA-èL¹g¦âBMÎHú7E¡M:L¬ÂòH pþ'ãZßGiµ*ÄY®»òÌ÷©2_Ñ}c xOÀ¨C®(»­YO]fMÊú#C³/ÊP/êwÛ¥f	«l)ørhº¬miúiN±ÈÍ= ¼ÂN[îSIÀ5QÄ·xXß4ñ¬tM4(§$²Q ÈMh;í\fòíó\RË&lIB<ü£êÑ-³f&ÈªEÛ+Ø)¸Zh\¶"yÑu³ÆÀ¸ú»q{°3èåÍÕ}¾A|u;ÏTÑÐñÿe³	Yßó_Ó«½+'åÿ¦­±yò²Qc¬	4Ðçú«T2ù;rÐp>u{ãFÚu{ÿ¶µ'zvë,ñ·^ÃÏïtîYmÏáÉ9	5ºà8\GÎDY?û>¼þ<	×qo´5ì7nTÅJ>Ùé¶¹= 4<î¢J_BÞ1ãQü)éâPVðSÖÒêÞ±Ø¤}âòË5[ñ×ÂdäP²z:µ^Â&½*I²A¢r!ÛUÛ= â-Hß2ÐÇãúÜ0|4'~ápý³r%×¯ê3ÄA¢òòÙÞsÈåØ-UôøÙ¤1­**E~¾ºdï1*Z*f®~RO¤$¯?Ï?KL¶.1ÄÇõÃãz|º,Â¿ÿ¶ðÃLÝ h1x7ßç]T$õ%A6ä= Óm¬ÆNk?}Qs ãMOvë=Mj VÑùÃÅ>êwO%ht°]új)Ø»i×·Am!d7ß$'öÄÅûã+9éH#ø­F~hm¦.ªP¥¸ï|ÒOWKúc¶¦³×Áý¯T±p)BñKÍ*'ç6.þu!bjÿ$¯'¡Ï!ÆV1¼%SÜ*N?î¬}]ÐGÇ¬ËùLmf>lÄÉù¡ËEá¨{iY«sj«(2éº¯ª³¾$jÃÍqCàX
bª©Æi·= øIÚ*Êd Ásß/ãúÚá+XÖ*j¸¾×$¤øËÍ!96#

ÁÅj£MÙQS¹ÎÊüØ,ê$á@dÖ0ý&Quz²üu àË©¨Âp±~jRÑwÄº¦BªWÃHÛü¢zFº§úÜµ3Ox&Å,^t?Ü~iê@Ð-cÄgEw9$SÞ= QJæÍGN~*õÚ¤%ÁØÆÔêJ ò¯£";~ÁõcTõ@!pæ9õö@9ñõúcAKíøÙ«{Q+e	*m=M1
ÔKÞ¸y¿Ê¹Ãw±ÆsÕ´L1¿§1	ã»q¾Æ¿hKRÄ¹ÔíC4µ{2}O¤4*«®Ói2ts.¢oªrÚmÝjç!·÷É¾e~¯·= åCx=}9)u¼Þ=}í¡8fÓ?·.RÄ9è²Æ3LÈû^Ï%¨	P4#ÿG$=M³ RÿÎ¦õnijÒ±×¥Ä/ ð6¸. P\9²1G¬a)a©Ýú&=MñneÀõÜæTE=MEÆoÜ[ÑHð+<ÏÁÇõýzÃ7Ý·ñZ	3H£&0ã#Â³\®!\G!Îø§Õ±ýåÛ Íos	èQ2'd*ê¢Ë=M?¡Ye¶G\_"©+
1'V1xJºÀCÜ²ÓØÙ¾ã®©u¢¯nÝË}ÓCt¥ôr3ÈÌÔ2Hð<eH4§8¨.A ï¾Vê_ÿZÿìôUÑÌDÄÝÃaw2ye$y;2$&r@ã¹;±SEØ«jÞÎw©&òäÐKÇâEªWYF³yC#PBä.:Ç§ÝÏþÍô÷«­b%£.ÜôKÔ;	¨¥[Ö1±×/bâËÁ¥]	+t+Pû:QHÎÛ5)ÍöâOì#Ð$óZM©U= +4t1¤ÝU!9W¢òøä×ôàP3Î6£§QH¾í§_AË¡l{@³]ãV@èO°2lÛEýÚu¾ÖÍ6rIÜYwx%*µ,,äu¸h8GNt(HÔö½øMæÐVA^Ðù¾'x[§= )üV'úäÉìàÖLÔæ#þ±«¿HÃfÖNÿ6ìÅû¹h|ÐX·®ºU&¨SKè8À¨l§æó¼h´¶RvvÆ¿£|ÖiàYXÞ¬¬$¬ 9ìDÝBZMU³(*Aðá,¹@Ý"f9:$<ø©
ÅJ i>AF[JñúMÑ.y¬N zË·]Mq·ßUëÓ¨ûÞ%úÇ/Æ¢
Á|«­äàÞMTÂgµÂþ \Ù²/é9 Eª4þØøºE÷ük(JØ!yU¯§S­ë¨[xç°= dø)ÅÛZE5TÚym:°l®¦]ÝÌwµÊÙwÉõÕºêzáÌtÛ1µXqæ÷Ãí+n8<1ñ¾3"ý((#ÅsÁ£lùÐ±q°Û'Íc£+Á3ý©Ø³Ïºí´=M+IM U* ¸®= ]©¿±°§´Aè= QaËwô9@Ù»4®q; ÐD°ÝWåÓÍöV½^!!Ìµ°ßö´>Z$o²÷5føúäÜW6°íêðLàT\Ê1åHÊbîn:ÅJ©ÕW ÏõìI'Í¥Ú= ­D|ÚZ\¶Rd¨=MYú!)]¨¼4Cáí¸¬D0ºpE)-¤pÍ¿Fo³Èhf±Rï]OaÖUÂ.ì|¹9ÕäÀÊ«;I9òHP·Áb-Æ*J­Ö5ß[ãP,ä	ñLïs¸f£ª£= iÍeÌN°¥4Ôå¼Åµ6ÅeÞêjø´< µjáöõFfì[W³±ìäuù;k>ØVqe÷¨F;?Aíß»÷@o÷9F=}S¿LYóþÔËÐyÅìúD¿/ôòì@6:ºa-¬¶'ùÁtÝöyhBèý#ìÅî°D;­ïÖÍi2EhÁV"9ìª»UF¥Õ'9¢­bì·ìKUmCj¸ó¥hÁS¶ýÇ¸Òç!"ØÕ5[¯¡»kHÛèÒ ß[_èöÑExe¡õbñEæ¡Õ>ûH}JUzÓp½Öwì&ÕéþY:ÿÈëCrÑ9+éÃùÆõþ³¸ëµþ]§tÀÉÞ=MzÄòõDGÏòòLpàÔ¾®àÁ;(ËÔÕ%±¾zÛÕ
Àh+õêÑ] k
BLÕþÐ}²Kö¾²3ÝÔÁàÌ©7eÔ½ù­ÙG¦Ú!²ÚGì= fPõO©¾­]ºwÇ1= ÷ü)OIÆylVN ?ÜdÜ.¦!<ÔÍyÔõâgWãtîÈq{ÔÈø¾Á^°¥öÚÚéQQª6:>÷+ÊíßÄT¢aÎ#Úm
Ñ%/-B)Sâ[­pÁÙÕQôëÇ^ûÅù6:ú=M=}EÉWÕØü:Ú÷cc>Óðèú=M«Í>BM««û³Â6ËV\ ÍO 
££6öfHÂÎÒÈ7H¹D,e©ç4tDË*¼åª«\|¯"òâÿ:;¯Óã±(-b@LSZäëYAJÑ+Rë´_*Zäÿ®QÍe¤p*å_ÜÑz'Ñít²q?\­+Ú\tí)dÑ>¬Ì¯5®>®ï)¹©UïUubót=}m_ª¸Sa¼Ø!ófTþ<÷W_Ü+%õ¡),Úá^«ñßªûòU8:;¤3¶³²w¾ï
Ín
QHËUlTÂ¯ )Ã-_QÐµmÛECr=MÝÊ!«(íÈo1iUTkÊi×¤ë$J3|ò~k¼?¨®A~wÖ1J5 æV£u_)õÏñuâuváun0¸êÙñÊ³³eª>ZÜ÷ÊÝüÐb[	u;Õg£§Â×ùdF_ _¸ý3;«)6Ñ\ì6£¡Ö&ÔÙgº2Çop4¤ôñQÖµ÷á¹ý¨ßTnáû	ßp»Ôöóôd¿&Ø32@
ñ~SbZ'º}é)àÙ+¬u³¥¹ÄÓæçÈLxh»Ë= ­ÝS½-jí-+üÃÑ~8ÕxÄÃ«mFÆìý ,Ú÷h½*]#Ù/ÐùÐÞ?3xKåii"G¢£,> kJØu$lÕ8ÔéJ\Q:jo=}º9ÕdÍÇ¤°3MuÄE´ô£â,¹>7Ï×åE³­("s÷ÓÛø
ê3sø¤ãóÇµ6ûØºÛmrV­x¾=M¶¤GOù<³¬[l>új!ó¸qi¾)Ô5ï³¥¢&1/h,áíýj½o­OYkÙ<¾%VÔ9ÁÛZÑÁ0ç¥¥2pÒäJ:d6ya¯:v= kiÀ®ÏûÖ#íQ¹§»ËáÑOÏg¦5 GQÍæ%*åsÒI2Ò½Ì¬Wôeà'ÈËbÖ¾¯,Ãk@÷èÊò³yg)g':9rx|¬ªaÙNÕjþMBÝö2¬mÛ%wZó+¯3ªg2*E:ÊÙgJ²íQþ©ÉyñhRÚ6ì¢?ÇÚàÅ²ðÎþ¦[¥ÿ»ôóc[8´uXë$Ýì¶z},¥9²¹|6y#
±#©'&Ë©ÓN¸>)ÂØç%O9«¾Õ.= ñhú,)JBÆ²WôéW+âícG8
Øl¢®ÈñJ­ÞM¹¤ªºRûÆW7/|®ûÜ¯î®ùÉ½(·È-ö)¼9È»ïöòTÁq©¡¤f}ÝÆüÊr{O$x³o»ËìæNqoS6Àü}.SnsShTÖ%ï»1æì,§²QkhD¥;sréê¼.d{·Ô¡ÃøY= ù³µî¼ c=}s·!î{å9yâ5ïòWüãæ)ÿ#!°'ÐÎm¦Jó¿îH©tõþâßÈFK>aì8í$¸_Pgè#ÑkáèÈ^ncÒêpH>T¹U ]W¾»#mÿå2@ÍÛa°Ê¾¥òÌîi4·](ð¯Èî xcQ=MçµtAP¦j¬í:k3ôÃ5A­Qé~¼Lo= OcÀÉïªnRóÊE ´MJêE¤ÛF§­Wüy|ÎR ¥ÌRÀéòá¸-Ë«÷^=MÒw]Ãàó£BÌ'­bA\·=M²ô37 ¬¼ê9aL§l½µ¸ô}M¹Ç%Wìz£§Úf«#ø%;ÆïprdÔ{V÷+Nj$&vX1yàÀNé1k¸§ïáûÏÒSgúÈ<áÃtK^­F!-²2â¦e~À^°¡±þußS=M= VdPiÉù2v<<ÃÒG-qERþ£NV³
¸	¢N@ñl*cð~N¤_Éê"# ilh¦&MfßÆa÷=M7BÉkÂYo®En¼ò³pTJÉ²íæ>Þ°~=}Uu|ëãÝ> Áà¶736Îb·×z}	éìÈÌ97yËõ#Æõ°;,ö/Ü*ÕÝE§ñ¨1ðÁ"z9röckø²<ø¿o¢§/^U:ú³õJÀ
'MZÊh3W Ð¼¶LpÒÿuK?³_ßzMo{5øÿË9ëa=}ì¹y]§?»ì¥í*º¼°8 çV.F4é
jò= ãâZÒu6T2fû\}µ}pÚÆ½ØÊôÈ¿ª4õx{U	.ß~Ið2¼yÿN/¥Y=M^j]ÃFYúc(etÍ$¾²/UqDüê»ÓâI¦©P°îô²ÏÄ1ù>ô°Ù©º²Þ¸Y®yå¥Iòõ.¥×Ì¢6(ÔöM2êý5aGQÒIÝlÔLÁE¾Ju&Y_ªûäãîå{ê^ß?3þ%= £²@ïqùúzSgçäB]h¸èða«=}Hzßù3] CÒSå EÃsLÒ= ©ãgk2ÚïF×(û{Øï:ìÃ¿qJ/;1ÜÑÏ¨~ëY8L8yRÁÏt&«r$v6vÂ5®kMÝ]+2æ×vs~|Cb|Üñä·éoÉïfû¹ewènêÙÖ^Ó-IZÎ52}P^þ!|ô÷Å9Äuxx9Aÿy°ÿÕ[§åÍký¨ys?= p=}|[= »Þ¿?}A{´x=}¯¤/û5-J2f§|È,yy×K?|[/}¼ÿhK~"º5ãBa/)?
ïïôÞy¯Pö3LOKØ:¾;ªj«{\Sjá¾2Ð§»Õ ^Òr­k~Sh},ÔË"õ,Úk5 < Iø¬!&ë¥G\Xùþ1Þ²= %"ø3=}#[×Uñ cK»ø:Â!)^¼Lã°F*q*Ýê VÁáp3[Õ	¯àzÈÇÊVÍ[Øp¸½$w×!GåNýýõ¨Ú§Ú,Dêî¡8bì.ZÃ°æð
$oI
$jßæ«KÐ=}¦ÒÉoÿÒ9q-täUÆªç¥,¸ÂñÕ÷¢ºk$ª´a­Ü:t£Âõ!Å0­ºã0Åè\6ÌõkêM}¸l ºWãÂ³u@6= ¾¨°ª¶Ëb³]Â8øÀøåöñhcu9WgÉ¸¾ÙÒ.Y©Ñ=MÌ­WgàúIõVL£½NÙ¡1­ÀÏñXI	£ª4çja(ÌK6:YóF^[³.%y­6ëËÐ±§ædÔhÃÜq°=}ÎF:Úø3kjÔ5Q,v¡"4¿QBh²ÒÌsî÷õ´Å³óÅ¦D:q«b2]­nÌãk(ÈóíéÎ8gåWt¢¦O,çn!¥f0ÝWB-øÛ_åöHÙªÍ½Ñ¤¢SVE0>æýa{ d= Û.ý±ÇOTÖüMµµI¢PYDì²ücØ4]_µ=}úý ÜúeìêÂ(Á>ðúyG,SéÏ­âHPYQÃ°q¤çòÎ°ã½|¥:Qnôx¤ÍÙRK¦cI<%tHà	+i\ÅOçvbÄÊä§Æj5ÅÐ¶qtP¶OÔ:H?³ÔïÇ¦Ä§}cÌÖ>]ÎIY1}öùé,ûü¾VÆ!ÿ½7I"ãoö¤öû¼VdLJ#@¡½üæôôm0ä×ÒcA¿QüOX@æ³\åÉ+ëÅ¬ÉÄ´¿¢Õoî ´~ù|y¬~êÌ)ã °?"XÝç¹µ¢ÚÂË§jbÅ;·uWÿ¶´5pbûù9SØl6ôQ[y>¢¬áÒkéÐ; b31jU^7··|ì2+÷×ÉhíÈh"?6ëK¿Ô5¯³iþ(Ê§0Û üÁW!lÁ¬úgÕÞNf¢bá¾"ÂRä¾0
= ö±G&ÇÍVÙcË5±qµ-°;Æ#SèÜ9M á­áÒØÿqÜ¶'ýqÄ¥7¢#v ]|Kas;ö¦=}(<Ã&ÅZZ¢ÉÀt·ÉÁ;ØÔè£E 	TÓq0éÝDOH¼Í´ñbÝo7-êÌ )£1cÚ½­]íÙ½=MÎJõ+!-Á)¤<±³3ó¤zWP~ü*øú§ëdÏÕÀäWköéúd]ÄC-êSrc
#5Ïøå@ÐÇôJô2¯°'§8%t*ë»Tp/FÄÆóÙÄbòJ6ho#Ãüu¹×àR3¬$!ªrññðz]ÉgsÁQõÎùÿlaè§5Pi¬Ä 5é¬ñ(Oç+Úfeÿ?zÝPû×@aëÜupj~GÂMâºAîô.MPÉAº
3½¦PéñÕÂ6U=M4ñ±FxäÇäM/ïFîãÔ£uáÐ\þ~\¾æ÷-Å,F<Sö×Éi638)än§£_²+SØ±é0»û>hâ×²âQÑlhÕ£5óø}G¿ªeúÄê WAÓ*ø{EÞpYâ	é'±E	L¥1¡yúÍ Ï!®kÎ<üXMÖu«?/µÎ­RÆf-³LvÞ¦f{¥+_);æÆ¡*¡ÎJB¹7g[1ñ!-|ÀüÞ­[¸ÇPmKI±±øVp\Ücó.ñH¢uVV8F=}ëf ¼q+HÜcÄW¸ác¯1ã/÷\ä.ñÂoëâñûàvò=MÓföhÛãúqãof£\È[Rº¶
pª¢cùÄF,¹Á®ÇRÖCýK<³ÝaåÔªY"äjÆ_leUÍÝë´Ñ)³O0±éÿØÈ,ÄBãî=};aî
ð;WÀ8s÷/paùñ¶ÇðñC3a	¡máóÈ¶3ÔCïÛÊþ«¢1y=M>W$dä¯öýþÐ¼?ÏHÇªÓªâªÚ	xbå¸v<&¦B:óÿ'ôI´Íý§ãÂ\kMçIÓûoÜ<ê®³Ñ~ÉT=}â²Éô3~ét¿ùl¬f6õñ93:;3\_þ3J=MÚ»¥O×ÿýr5/ßü
þªY)¡ñ½= _¡Wè<Çz>J¸
±¿õØ¡©kÈýIÕ(-}oîõhWÊÍüeg°ÒKÄyXÛ­ì´äMÉbjÌüO®x´>-­	§µ[ö*AåAm¥Uî»R'úÜ[­d¡H%WýüÍöäÉ
Í9Júô/QS¢¡$QóóÍXÊ°#0½ñR%äÍuÙiÛÄíJ5<i9Ï5ç½°ÜW"1oÇúP08²RØUSÚ·&ÎSÔÙó¸k²ò'­fñ^,ùébGÄsórk©f¹QÆ!ÈÆ´Íî!3I=}R@y­Ù~v¨?^x¼=}	nÉñì3w<×"ÞóQó§ÁBæÍç1þÃª&·IR)çÖóÿÌ[ÜòÝÌT"¤6y¿úT"YÂÉÆ
JØw©ÜOc|×"ë{/ZN÷¢úN\,
M'z¡ûöAcRä(Êû7rÔÁqOçY±ï@áé²á93âÍ	«î4[³qÞf4äù7h»ãÓ¶/ÜQI±f´À£óp9NÔëX¨BVä}å1k*µ¹Å:ÍM*}ü)üÅ"æ{=}´Ç¬Í¥,IpQÚ¢æ?ì DìÒßéÃKÔÔü/ØY±éËEñM³ÄD^V5B2-¼w¼w 2øn1´{OÐR¼wÎ X¿ìÍ¢zù¶19_g5a¶©Aº'Î<ö¦8ÌÒsö¦¹*Ê¾
j@¶j	:
5j= 6B@°ÅLÛDìszöõï]ÊxX¤Ô{Yú$[Àï 1ü!Z |«e¥U¢Ø3dµhÎjHpöÈvc=Ml1Ð²i¯ïxúëRx±U)~ä+® r¿8síNÓ(§M¸ïÍÇqºÈ½¸ÔÊP§$=}îo·ÊÏîm=}U\Û!û|nì×Ç%EW[6+CR¢ÔÏæ[E±âóÏ¢7/ÃÈØ´:µQnAÏh)²ÒZ.ÄÕ6úòj_?£7Jnvï7Ë9£2o)¨s¿¨ëxØ7.bæÅd0¢/ÅÒä'qà¹JNP¾YPB{¨ü¿»c Âç´²©¤Q<©»CJ+Uh¹"EÎÄ¯ÊÀñÌSX9Û|ÒáÅ£&ÙâÜ¤±öÎ£ÍJ"õ
ªé'P?U&v¢ÍÏü_SÎóh0G%mÙ	õCçÙÊ*xRúj@uÜå¥B
#1ÇAhÃÆy2ãt<®!_Pì"6_Êõ¨5Z*X¸W¦^ÅXÙD{¤µEªC	G÷®ó%²-"ÿG:ZÒâ"¯¸= wÇÒ+þ=MÖãßàÔ0âÚ©©ÒÔTÖ÷fFoÅ/ÿ±[»àQº '2 Bº Ç»u­zï%°ð1ÂÝsY»ú3^bûH<¥<¥P³®=}ÍÕõÒY·òø¬Áe#IýgK=}Ã¢Gì= \Z»,»,:áGzmÆ¦1ñø+ÜGÚø´ï3þt]>ÝÁµ¶vÍZ¶ÒW6²¢º(pÐÐ+Tògö3~\¡÷I=M»òV¡U öd¶*¤¶´ÙJºÇ«º$÷¤D17'GdÎ9åÇHö67Ñ½Ç¡èuf9É§JÊÐgÐk#ºqËü	¹lyÚbÛeöÔ3cçòÙòøÛ£Ï-mH\â5OÍ»ò3Âìd<îEm× Ù¡SÛ¶ç4®¿_,ÛíöG0Íê{øx¼!¦óþa3í"²¤jULñÈ×Qê¥Q2#aõÐ#<ÈæW0ÞÄC<Ô}eµê<N+q&*gr	AòãIyeHü)ó·ãp\Ðý<Åê¿øìRòñ®6ãúTAÔyWÅáÑåeOmôEç¯êb)HØ¢?£Þõ½î±¢$WTÄ\¤·ì,(à°3.fÄÅQIÖêFWyÛs,¶s¡@ZX¿¶ÁÈmê»ÿsêy%
MU+¢å1.FsæÁÆ¼Â9ïHA»V¿wûó.W¿òùÞàò8°ðOÔa¤U¸´Ê$Bz+8v2±i¦ùÆB[­uMñ_¢<!M.³ø )T=M2kÝ~¥áß²AËª1ÇÕ1BvûlI¢YûiATtX}6ß*âÄD:Çë1&úµî¼\AQ|]áó3ÃtR±¹ñËÞÁ	ó÷HÖ
õ&ê½Kÿ=M²UÙE¡ZÔôutd+*cq¥4k°âo¦ÞIãÔ\O= #¼èIy6	¸¢Ïá\¤ÉÏ¦SöPª©î(©â(| ýpËL Z:ÞÕèþ¥Á¢3ÊÀ÷!*x3ÖÅüä¼ÈâÚE%IÒ~uDNG»k)5³I ÚÓ8Xº×;R_øF3³:¦*sp¥èØ]2Ý79×Xs1Äv¡aw%éH ÿ<i1YâßjöÊô½ãÍQºæÅvê= Ë=M$FÄK=}gd Ê8³Î}dÄ1²sGZ'¦xy¤9Ô¦þ«ßÑN!_Ë¬üîZs7 |Sf6°Ç8Nû¶ÌT)½P1Ú?:²³ï ,Ku¦æz¹ÍÝ°')ü¸rªd°cqxðeÙ9L¤µ§¹I*ß E20Ý­ðãH à¬î×\póÒmê×½þ®mÈ1Ý×= öIÆ%YÒÙ­%à!SÒº­¥ã©ü,L2´ßJjü©K;Êi2¾gËÙ¯åé>Õ­%à©<Ót¡c(~_3Ë¨\O¡Ò­ûÔÄa¤(õ´ÈecïÅßgVIÇÊ­hÈu,
4iª¾f+Ø/âE,Q×a[Ò¼ØÅ¬-kJæI>ÜÅ:¯ÕÑnKÜæF¡È÷$&Êj7s_ýç~;ë_Ýþ7	X6yK$4Í- çÉÜ¼ü=}ÇâÖÿÅm«ÏTýÁDñ= xHJ×6x grqaH¾±Éç¢Æ#p
ê¹üd»b6«'Âfmª¡¢xYFR4Ý5þæ©î×©TÒËa£¯¥¯%³ßÊû×©Ëa#½ßÊ¶ßÊ¾ßÊç×©ÝBÇç>vü©Yü©y4®L}«ÜàU¤Ðúl»Õoqu«¼Êÿé5 «Îï¨^Då	ÝsÕZR»w¬Ä¢!ã¯¶æ¸¬Æ¹Õmµ3SÈM×u¬'÷(÷^¾trw¿ÿk×1Ä´Ñ h÷
ïÁÇWTüzª$®©÷= ´¸ÁÆ9ÎÎLq1nkfö¦¯ìëC>ù&yË:(Æ4Ùµ10ú3çlöQíF3''¦­!æûk­!±L:D2H'#ÃµÂÍjØ~Ëæ²Jk³L-¦óKçÇtp²C¯Î²+ã#µªÏdð½ºø­<ª/ü3ºÂ 3¬|nhË[±Ø"òU=}9V¼û"ºóF[{ÐFèæ_PÁe^n&¦-÷4":Eë= ¯.ßÇÐ5!GÇðl#\WJË(ntu×'/¿ë/:ÒS¿wJÂ½(ëøàQ8Û@ÞÇ¯2
1ÞË@ïÞ,2©|ô+ñ¡&],^¤[ª<1XL{\FÍohÝîd)ÚÏ.Eöjúïéd³[Õyî~rûÙ^ÓÕývtqÈà79ðQ+Êº:²VÂ~MÎ©ikYÌ1¢>±þ¯+ôÅ<êE¤Ð÷cO½ÏswÿnýZ[¤ª]Ó|¦±VdKeö´ÜHkh@j]%ºÇÂ^&Mù71uètn¿xK88ÍéhÃ7àæ+¼¾D÷5ØÿëÖ#Ìâ: '*¥=}¢£Ù=}&µ5e¶
¨°ñGÅc.	=M°QmSKøIEÙÕÁ}CkB³C&³zOù#qg¥NLbìñ ØÒ[äCØÇ&¿7ÑOnÓ½Û£ç¥O"V$«ºÞø(¯ËÍo®ä°ÓK'}{NHÐDc©Ô|¶$Àñ')
-C.,ê?$úÁû(ûtÝñ­Þ^æSz*¥42ÚV=MìMÄ}­é{ªA&û*­Ë^e°·peO'éÑÄ¡©+f7VÌ­ýåMuq©ªæÍç(ý[FïúXd{SúÈ£¼÷´û¬MJ?Å¥VüVÆ61'2&×êïQÌÕa9û:°^\÷5dåûLN¹àÙkïLjMGOíî{=}ràùÀÇÍ4­¡ÕòýIÔÝöwßÍiKzé©¾ÿÒJO2MgÉ9@g«"~Ã{Ï9;ùRÇ¯îÉO:ãQ¦HÔ¬öáëd#üô¶=MîÏ#[¾:»=MÎ'Q)®&QE´:Pè@UfKÿdP[?wÿc±oØ4¢>¸djÎóõµgNÌ;Âfbºïèç¶4¶°}0,:ReÒÛ³[|ÕïÃuW¦Û&^M:xEiåÿñ /Þ¡  o¢ØfoboÕñVãØA¸ÑõÆUÁÎ.lXf¯'0,ìØÉhDuúY×¡R!OqÁmë=}ï1EGq²¶ç*?Ôü Ky¸ØvyXß.s1Ñîp1Ö®q1Ò®s1ÔyØ¬wsÑÆþ:¬Û!£b|@*}VØßõ-Í/a)²&Z?e1×Í³ø= XQêÀc'ñKWâpÛ<´Iò$R8=Mé\EÞÇ0à<z¬â³åÿW7¸ç$O¹Z×q§|èpËçìmÊ]"ËSÎó¶ËÎ&ºÚ±mû?NÂæõHJò>,æV´®¹*ÃL	cÌvàsèÜ<z XùæNjÚ4vm¢Â(»ZÌ=M«;D°êØ2Û=}Ö%»GÄ¶ÔXhYaÌ=M¶j¢b_¿½¤uJK@1JXñ%Æv%ã®çZ·H cbOµ\\Ü¶ãòß³ISYTß¥#vXZòËÁ\¬U8â®S¬ÅÚÞuP|Þ:Òo sé9J§&åòÎ&¢ÕeD3ÝÚ¦­ó}í»/jTÐZðÊvWPØ¨-'¿Ê¦Lqé'í_:Ã÷ò÷ßt°ÃøøóxÙdÍáDÁC½N¤&Ìl¶<·}£6NÜäq{@ëÆt14 ~ñÞHãú¯aeÇ~¢ø4Ç= aßìÖym)â*Ú
ýNû3í= )8aÍkbð²âý¹p«aGêYjÆÀâ1LKï?Ìû?X0rñ jÜà¢&gxßs\Y¨X¯×Ä´ýûóäåUV<ÖZ¢röãäN/_~!àúû¤wEcy÷Fá9ö]
Ää03Ê°|fÈ^åv6F2¹æx:(´õZG¿°éqø(åÁ]TP¢tKË+ËÅßù Rk.5-ÃÜ/öÏÛèc«cp#S= Ï>þdd;d9tF¬ñ¶¼[/#_,Q>9<NV93¼½);:oyÆç{~¦Îò#H{|ÌòúoBüÌ.­VÖSêCßþóÄ*A·^²¢´TvúzÌ¦Ìòã=M&¹ÄZf|+ýa@ÎD©Õ"SNËçwÈLËùùG"iO¹;j~ßÄÕW6êVTZi±U½PýëÂ ÛrÑp5294-åz #Ü[(=M:2àAÔ8YÍ§>'+2$a¬ÞÈ&|³Öl>Å>¯"ßÒ°ÂA{W½jÅî+Ý=}æÍxªõÍ/³7½õè=}<_ Ze\¥¦6¦4fCñdqWµIÆW'ón]®[»ÝKR½'i:û'K¬]3|©vÎV1äÿ¿Ëû§kÚ2K|Ù[»Ù_=}¿{wÎÖØ2­~H^I­YqçóoäËlsxóäoä«l3xóôoäëlSxóìoälxóüoä{­Yù~\3÷2l|9÷oäâIgOû§+*©Îsgá)¥ó¬q\J¯A·ÍÓIk&Òð¬i´EõÌÇÇx1ÇG'=}.AqÉ/ïìÿýÃc/ïä¼~zÆFiW·²þý£cAW·²nýý£cW·²ÿ\¨5[HxÞBÞq"8B(Æí­IE­ä²0½ÉæÈ©(²f7Í9ò%Ý@ÙìO­ËP]³Áæ
½ô¬AR:àíOýË0ÿOÅ²lÊ¶]¨;´é
@Re.d©Z¬Aû¦ð= ^½4¬A½û¦H¬Aq½ô¬A1½ô­AQ½t­A=}ø4ín¢kt±Ù§¤käJ-uI-qÀÛýh½êBtÕ¢i'ælÓYí¸6Ô¹6EyÜÍèÛg³/¦qÚ²%"ÌL µµýlç|îñY^Ñ!ªÑtlÀf*ó´¶ÖÌT¿V[êðA×Jëª4+öÿxü7íªäf»³å7zßÿGU­iÚê>9#q×/N¸5£cVþÍ«öéºËZT~_h«g+VÍwñ´qr?¾_­E¢!ë=Méé³GþGµ?hh;ÁUÒ(h]&5Àå¯·ïmØUMQi¥Ê5»xùyêIåÁ®4ûùõ?tÔï>ÑÃswTbÈÂ_ ÷q÷q°¦3ÔLT¦ÿ¿<8â÷;º½-nw³[z0óÎa=}Frzãîîx"xºb»_Ï¾ÛxL&¾»SO¾;vÙ6jO_ÌÞS²6ÚÚ<Ì
[ê©¦RöÓ ¸2th¨óGN¤¡iõ¯£ÿûì§æéX.ô	~çüzXv×ý@üííSdø:µñioÄíÔ/ýx;ëFkåaHQ³xr÷¤$s Hý4^c9A~Î¤m¥pK@ F8®|àWñ1}ð-ÿ b#k<íÀGelåÓú)Ciá£PD¡D¾=}Ý!¡¶6Vö	@è:û¼.üyIpYaó)YL]@V¹@{;4¾ mWHø#{µÓ
ÌS&9@¶*øyKéßó×ùù n«ù.awe¬C·Cß~æ½¨3^,Þß-*×= ÿ£ç©,¾Róêì¯­ v» ®õ£%EêòÇöÔÿ[¯=}kÿwïûg#tÚá	5= trxUÀ×ÏÚ9Èzm×Ï|rÿÎ4~ß×gáòõbðÓQLç°ÑY)am[i2¹"áÿöô2)ÜÝlÒ®ZïM£{àîfä&í"Ó¤= KLa
8?>RSçÏèÜýÿ#ßûÑ¥à=MçpiÍí³Ïè¾Ðv¥$ªa,pþB·Ex&"V*K@pÄSÁÏæVöxíI +{Ýkî°= m"ºÿÉ¾ }+h0+hàÏoy8?Äú§C¯û6jé'æ×tqNÏiÝÇ.x²Ô;bOw¨~i]ïÚ ;À#Õ¦À£EN fT¶ÑPÂç 0É­ÄTk¨6ú.ÂëÞHXD|:¶R5JÌ´ë¦´j=MV¥(èÜ=MP&êLÇ7Ó£ïzÎQRS#Í¦ä%s¾aàxoô¯9òÒ>Ìúòg|Ãf¹g¬ÞvïV?CäÃoDúO4'S3óÎüN'³æ_Û£yIG7ç!hzîàµp¹ÓÃ<;|Å!ëV7éÚÅ+dùÀ÷Ôh.-Ûd*Rï<¾²ÚLÅÞºCQã².¥ª¤²= Ø§ñÀß//ÐMÆÙ2¿jåTøûQ*ó÷Ï'(ü/)],aµü®{Ülq¤Uóx5@V	oÏC";ÁåP?= TÎÍÐ(d¸VÃ4=}ÇñÈ­ÃÊä²øÓô¯ÅÚ øÛ|Ý<eò$O~!	çÁ!ß¹©}/L=MË³9ñEN:°±É´«¿Áx¡ôJhÌ9E¨]Ë?ËÆLWý«Å=}yÝ¦Ôæ= ; §2e_þ+Üî1ÎÕBÿ>ÙHÚaÀçx³Kw¹wýoTB¹Ï{$¸\xgc¬dC½*
/a,ÒîèÚ0èL×ÄáÂrãµ¢JPo(3¢1â½ðÊË*	}wÉËbµbWï´ßî®.»GöMÅ= Ê:4´¡¤x!3¬21·Ú§³Ö~mfù$Qh&zµèBÿcÝþñb+DF÷BôF@k5µ@·MsÐ9~81¶B¬¤u?t=MK7ÛFÓÞÑ¿2ßæ°ñYÒ:ÞI'¾ÝCz¿èæ0Ý}|¯z×ôü¢èN'Ô>
m{K:ß
L³j=}ô»³1ã©V®sHw}7Czw5è	P#|ÄpAå»úe>¸§e±1§pôÃJ_ Âýàg6ñYAQ= 9<ë%ÕD\Tá¥à-½Ýê2¢ÙÙ$êO$ÎfðÌÍéõ&jo½;ÙiO5¥ãSfq*Iù$ðÒÁ[±Ó)ïGÿÇ<á@òvMÃ..[P$ªÐ¬·þU¸IÀ~|">Òi³)[¹b¤uÿåA_ßÞUíÌÔãªæúÎ³ÉÂ¥µô-*C¡¯¯êÔðZ.¹Ïp|eÅdÿ(ç*×-Ø]«,ßÌÂX&Lòjo2,Ç×ùq{R= .îÎü·VÅç0~¡£Ë­ÝªØõi]À²|Bq«RúIÿÏu°öth# SNß:Óû×9w4¸.»½êÑb¢Ô3^°êlÒé[õ	^h&
ièfY:ñTþÈjÓº­{82)Öäê5GM¦Ý¿Ì£Mø	PÖWv|éST2
ÒOè¾Mú×oÌ\wn®8ÜbYÕæT(_Æ£¦:äÁpÛøÁ­éÍÒá§ñ§êG,UÆZ<D½ìý%IÞçÌ[éRºßÂ!}¦4å!KM¦eìà*³[éJÝse¬á1Éyò:Rö¼äÝPïÊXp¥,±mÆ6kËXOPÍè_@¹c$åjzØ3ÇáL.Ùç"'.vÍGëÍ5üvÛ7ú&ÁX\ij­¨jìÚ4£C4qä7i¶ÃSv\õ!áÆ"[Î2ûEË¤'¹ºêRÙ½óbTâÎL8MÑ¿­+ o³öÅúBÍ |vNëñfHøh¢>Û?Ç&«[±¹á³ù¾µ¢¡0"íðVáÑfvG &¼àbÊ\l%RFFnøï§
*VElf³Õß:½õsîØ?GþÑ[çrooüæ2Ó¹®mnÊþfã¦¿S=Mf¿v±¿Æ"¤ÖM =}RZ ÎIFVãÍ´ñ_l¢÷%Md<ÜPöG6Ö¸uqà2ÈMkÊçö²j·PäÒ¾À/÷>,Fæ½÷X5$Mé©­zPç|Ç½&öõi©%kxpLT¹\Áwµ]¬)æÈé®Ã~Áj7È¬Ü¨;¤=}pg¾Wnk!@Oà­[*»Ú(ì0ZGô)ù= c&äR7W¨ó\Êá¤ÿýCL0¶å"ÿõöcø¾­¬#¯&JçR{ú(ãÚóNÆ¯/5v­UNçfal	3×¿OrÎ=}v= "ýÑò}ÊWúÐxç·ö½O}P­áØ6Y'Ù1å©#[[³0ÃlÒw ýíGè²ÂBÖÂsûi<è74Uá]´=}>íûúK=Mj;c2Å4Qz ñçÎÌ$Ç
%¡¿QBz®Þ/_¶J9×©8¬nÄê=}Â´­3k\³ôç´hGÐ«
ÐõiÀ#krzÙ;ê|âÏÅ)d³LßÌIÔÈAÕÝÜqF²T4TîaÂý: µËæoY¸úo¤ûè(c§WÜ,:pÊQ&f[N= T5¼²f¤À±m¢y{Ìï¾w²@i@rÚ¿(/rÒc¡-««T½ ú¡õèkËÐuÌ5Àg¨mn.]1ÖDÆ$_ã"4JJT<SÚsYãIu0%5¼ò>Û[ÈHÇÄÆÛú ½ûÊ?BªE¥ßÐ¥lØmv©²R=}ÐÑAÄBÇ«â°²xZ³eìñöç Ç,«9ZvÑËâ	¨û"Y _!D®Y@1éÄV¸=MH·­gbÊõÄFÁúsÝ°u0¬ã«ìØ3¢¢½éäuß5¡Õ8D²í§YÕjÅó÷3³ü µE7íüiª¾ÀêÀK=MÑûñ¢ ÿÑv±ñd¯¦&ÃV­Tä7È{²iüL0¬lë-£ýRèM+°Îv[È½®êÀÎûì½Êõõâòåû÷ú(= 18û²Gé}ÎûÖÏA%«³EÇ=}¿¦Ì3ñØXpt>¯ëÞf%LÃA¾úzµsXìäùÏDN½EQG~QÜVàûè­£Iò¨Û»âül3YfïO3ÆKÎ¼ KìTGðB&Üâ#ìm=MhÙ¸û¦@= bÁY7ØB¦½O¨ ÕL3¾ºt°·©ê#µybäoAlZ=M!¬ìÚÎ;cu6ö[×ÆÑò­$Åqó!y¦¸K@³áøÁ§v°Ç6È7f&¥êù)R±%þÊº¾ñsÞë¥e&TvQíU~¬ÎËL&#ôNÈr7bO= +9ÐS"%3=MTÖ´Úà%M9ÁÌÿ÷^­¶L×Ú¯ñðçè£9doðfe.Èè­³YÏQ²wãl×ÿsgî £tëþ)¦¯ï^À×|i$µ°2×ç¡îï£Ñ£Ûw.óS'6¿åT[OËg=}ÕÛHùëéãG~fÖ»-+ê=}ñjBÏ¢*ndf£9b©£±Häú»ÈSþa]$#Ø0ê¾s-Ì'Zùr§1?àÌè|GqâJgfÍS^=MELJjãEuÖØÿp7U[qúÞ([:Æ|.ð+¸H©Óå9 a
{pTOÇÿumwqºúÄ¶óný=M¨o;Ã|+tç7õT/²1:÷î bá~ÌÕ= à´·¢YZ-[Mj^ÜNJÓÿ9¡5×B'RÂ]ª&Ûwç@ºtÓÎ{Ô¯ZhjÕJCÚ#PZTØZÆlü=MS¤·3¥S¼ÙåtôÌ²yÒÃ6dh)%#-èr4/Oc%sjµ5O¼$2{ú)¸ØÍ|÷L­êêJvò~#}ðe©ö4í=}Û= ÖZ¶½Lüús²Î Ú¢¸ÄIvíúV½u)a!NÍ#©Í¡íýM®¶iÕRg£¬¶HË³Mà)v K
"Þ?@ë°BêçWqä®¶me¾Ey
büUðþ,²ñîLn3tvÌ­-î3¹Hç\MVÅK«ó¦C)<N îí<ZØùh8yÅê¹ä C|þú<ph3*À0+f:Õej/.ïDðÍX³ÏÀ&àNíOÎn<=MG3,UË¢SàKÎkåqìæEbÎiìÕî-ïI¢P%wrÈ^´Zi=}ç\*vI¦R§eôª8YÉN¼Âb_ g²ñDüiµ|©3ºª%Íw×häµ~Í@uâËÅ¸î¯òÚ±!a2Î$ç1úu¤¹´|òÙú­/w?¨ïE©Ü/Ï*AÐ·¾*TÇB!W?e­ÁXÈÕ Tm·8a8Ø.%ÉJÐÊ"Þ»ôü)dS¤§ýòM¶¦NvTKÒÇ0°Z <hË=Möþ´+ßIÙÀÝCùï2$l¦½ÒòÊÞlLz<_1nb0ÜÝ¬ &þÂ®¼ë <(YßJàk]Û\FPäÝ/öeVÙ};é}»©üSÎA
¿d
,ctÄÆÚ.qo¬z"&pJt¯_nÌç@¹Ìõ³ ¸?×¾A#×²½RQ+$-0ÊÕ)£®c¼T)^{ÆáÙ³_ÅW\wö|MH JÅßêrÀNQREÜl9Ý2@Þ7ù$1 ùI¤W$ðVîêð,AéNêýôk¢íd,$qÒzÊÀI±Ö=}qµùpñê1fÞÿ­a4"§5ø»¶$SÓê!Yðí	³MzPÔ_RÙíÚ­wOÄG£Vå«wP4lP¢Å¯gê[bÔ!?@E|)´¿pæÛÎ_£)ù?yç?âkGÞfî_1ªêd½,×=M¥MÏÌîz$íôô.(OVZ¸ã¹ÓÞ¹·Þv¯qyWHÌs1Wß«ùLxW2\öúÅñk°\¨<zÿe¸HÒ÷c(WÉÚmþ4Û1Ë2°Ê?{j·~]ï|;ßp_ýu.÷Á|(CßÌF´ì~}øµüµzètQx/×üD=Mz×2|¿u°áfW^Þ=M×¦3Rx+¡|ètWÑ|W	¿b\ß¥ÿy×-?è¥YÍªÆ¦µk§H¡Ï µÌª=}ÿt# =Mb¢L9øã=MBüæ~Q*1í¾7îcZ6í[6í[6í[ÚEÚ«3ûîwõ
H1å#L®á C³Àd¼õÎËåë]ÏýørëtC¾;ëD¥]hx¹hqªxAìq6gExB¡LCFÔÑFäAßå¾)3á¡ÆÃ=Mi*QHá¶øBØ'a®±HýÚÌ«Û°R= ­GIð8´ÎåüêÇAï¹Ùo@þÀkÀ×= !x[P9êRÇò¨'mD¾ à@¢T£sûº<pÖèê}låJ-¶h>HÁ¬Ø êÔ~þIP²)Tjeî@ágúP$P_c+A¸ì¿ÒÄ:@½pµÚhe:½Îc²!ë79%í@Çä®®ýN¦ý§» ¬ùåjù{Qû,ý_bêc<BÝá00Oá÷C­k¦{:»4ïèähwU¡õÃÊ·'ÿ¤Zø¾ ­= :ÿÅ?|ö{:{NtIsîiýZK]ë$gãÐqn]ü]z×¸)0IëKgKË%R&%BÃf38IlÙ& Ä.tÚj©T@.N"/X2ì1c.]åË3Í4Þ4ØL©fi&[ÆAXV0Ýß ËS­¯Õ$,­V5®ºÛhß¸7À_»íÞS<{9uóf´Oy]¿["Ý)=MW¾TUøêî*Ç+#U¿Õ»Õ=}Õqªr!ò'ò223²Ë/tÕÊ4gzÁ#$Ð¹?½º0úz^måÖÍwóÀ/úwhZ)}ÛÖN¶öÈoN-WÎ-bom®0´Ü= î^k_{a|ù §¨Ä+ÛâÀJà5DT	)K[\«Dº£ B·NÏQ5öéM¤
¨
³·-îµUìî$ÇÎì´4Éì>I¾ÞÈ¤öoöXÁÑvóU|OeÆPG½AG»³«#§âÙJjU³Drþ£|OÈè!¥mÜ øFÖrÝCö²V¼AWfpà¢DV«185HP£³ÉìûÜÚ(sÓ~Ãêåt2Wiìµø³íªë<!©å-I]íS7Á#×	=M+g®Ò= Üs;±ùªW	4³3éðÍ¥OÿÃ¨¯/¤Pâ=Mîæ!ÉÕÔ
=}f=}öú3×*e' XE«ðØÅÏ¼éÒ. ÊI}ÅÎe¿rk?O<7³»sù]5XGcÆÏÙô<tyï¼³'¿lH<x$Õàa¹ïÃzi¯ DþKâû\ìèe½ÿÃjIRjÖÆW¡°²¡/4z·{|=M{
ª_tÝ¥1n=}QµOM¬.zÕGXZ£ò{1JqSíY×ðkeo¾¶m¯¬ë°:ÎßýpìÅAÈçkwÔ¶km}í¾ØÒyÎ[Ø¼õ~fÅôÍm¼ì¾±tÇZOXò"tñN0HmÇ«jÇº8ìNº,UÈh1äÕün×-Zþ«V§fÜú\ 4²óQ\KU?k»®[ñfjK_ÍÆ»O¿ñeñ;qø7P5{N?³2übêe¯o=Mí'-XùiáãWÈ©6dÞøQêl6®­'xÎM/z¦æ§«<Õu{¨»wYQù|ÄÌ½ÄÁò½|¨íò¾GÆ[áºÄ\=  íÁ-ó þÎâ[§Î5àG©]|á©4záß¸Î­q
v&ñÇ
 ¼D×c§¦É¼O¶¤¢ió4g¼QOÉÐÄ
û¹EÚ¦+¡fìbhaHPãJy§.µ·S»ññN&3Éê¿Ø°¾8ÏÆýdþ@ÕË¼Bª |É@AX£@Ío }Éí2=MÈ¦·P¢@WÍÞåî
¼<iGô7Êý§××´IYÃ
zÀ®3¥Lf¥'	gUàÆ³ãÝ$WâÎ§gwóÂÃÂÑM
*dNWTãkÇD¬ô-ezó»´®eÀÙ)(ÇªJ!þ¥¬¦Ô£)G	D±ÃÀµ +à·¿9(òÏ JWª²ÛýÇ#{ î±xã*¶N6l /'õÛH=Mg^¢ì´	ò2ÜÏ>/TÁN%A/uª²f¥//	ß5´´øV©ÜmG[ÙÛ»Ú¤´ä3PPg^NV:*û®~mèZRÁ>§ØPèQ:1gÈfQlL³&ÏÚh§7ùTÒm¬¾6BÓ¤
PÂ<Å$¾ÞÞ$ÞÞÂÐ/Y"Íû3ö§]>y¶½)?È6»Âªqr:Ò¯w>=}ý;8wvmp\2tÍ·ò3Rjî^¬N/«I]]{cÍÙñ~[fz·{oTunÍK­®JèìX_ptíúQ-¾YnÍ2ÙÄ¢=}<¤ÞÅÕÍuÅçóR¢ür{ÊR÷'gV·lz~-KÖ?VµÔÂß¯	ANAÂxØºßßÚÊ(âNsËÆé0ÇY*«Ý"zA¡\ºqª
_¦¬vú~UÎÿËs ¼Yaë·±Bµ~®./>îsðr¡åÀì$ÉÕY×3²Ã¤R60l¸-£SY±K]9VPmhªYøxtrfFà÷Hrõ;v¯9ÝUXI=}òJL»S2NJ*Ûe$Èl¶ëIû?Û]T%)½JþRLùÑ[Òe_,î¼³{)ÁËWEo»ñ~n3FÎÂç=}G,ek÷ædÝ­ûÙÏsÎî³CÖÅ§¹«+êhdLÄN3,
ÎK©9u,1á¹ñZ<1)GÊ«ÿî{Ó¿RærtÑ[Rsþ½úSÊÌ,Ü@àËêV7Vÿ F¶®>ó¥1ÉÇ.¿ú[!)çîc¼ãád6@{lÝ×SZAíz<(=MÉ¥÷·I¹üc1N>óCãRóÊnÖ?kbÄö®á«#½-o$µ=MýÇlÌ»ÿ}ÉÓï-k,åcweÖT´÷ÜëWWnZÿrâYfÍq.3ÆE¤¼õa^3FÜHúÊ@ÕÛ²òNîÚKTúò@(í¹¥7µõ²&¾¡aÂ~=MÝ:fç®Ú3ã÷îqg­ò§ÏÙ1±qü­½ÿ'¥ëcR9q<uÏÍÑ\&¯F¤¸õq~köiøIfdCÿ;ð{ñm/'åºAëîxfÇOÜFxxF6ÓfÇF A¥p§gi'xOÙ6¦¦þoEuÝ~\UT"CÀ+©jMPù(çìÒ¦Àä o/ Ê%ÓièÊ£â¸p<I0ý´+)»L:²%+àFê¥y}JIûûèj³cÇÃc=Mç®DCÏ§'6/Í~2L(XïÕu¯þÉ7
FgÂuò@[¶ôÝÀõS)¨mãÎI¼äÜ	®íGÐøó_ 5,¸êëèèfñ(öHã=}¬¥ñö Ë±mëÕ ~Åd'Â¤ÓHQÏá= Æ÷mÂÝbÞb#ÍAë}à¼¼ã_XÞÂò!þ)´.Ú´DGG¦íÒ=M§g³÷Ý¸Äªà.½ Ì ã£íÁ¶-FÛO¬#(Ðæuè!î?[µÝ-DW= áàÑuï'jó´.ÿäÇ¦â²ÙK/eÛAñ3ãX´ú¹ÑA?2EGÌ©Ô´æOºÕc5öú¼æÅVJ7aQÊÔ¤\@ì¼³ÏÁ+Aë²__ÍÜï¿FQ¤zÁu1¢pÓ)Ô=M$Ö3f²ú½?Òuâà$ðv|sÐ¡ÿî¡YÈâä¸¶v ­0þÓÎ~y?ÄÆd(m¢(¥¢êî¦£àÌàMå²³!ùðCz_F|@CõDA+#@?¨ºaX® x¢ø¥câ,ÀÇ9 ¥Æ×ÁÅ°õ±óî86JzÕÅ<îÍÁÚ,Ñ¢dmbÕÐ¸~:¨	e.ËÙ²ÜI4ÉÛ2uY·®HIÎ=MY8þMjKLr 636´³µR¢YèhkG¿Þ¿)<þ6pÌæFvµsçxø;Øuõ¨õµÕ¶:ødT%«g¯dß>Ðù}áYõ¯×OIþÃgÇ'ån»5¯ù\0 JÔØ©e¢aR|(2ÒYî);§uåÖ3ûo}¬ÙîDRÂ)ÔDÂPxü8úæì÷xµ/wn¾=}­Ü=Må·\ù%î	wÞn­uÝö|ful]©µÅß&_]?¥Jì<|ë*<z8û¬ýåJrTk¥©¯ÏÏá"û!TË'ôtÂ!çRk>;#"B$ÛS#C¶$&/¬	s_l]¯K\Þ¦ß3úZm~iRµ¹Qá¿D| ÔÈdiå>´ßª¡ç³®È¥3ÕÔ¤Ñ1±"zn=}4rnP²úØxzRÅÕ¡t~d->>?¹ÛÃ±¢?µ+ú.¬°ÑaK/¥q3&î0= '³[/Ò^ÂÐ"oW	ã£]^ÀÿïKË§Sý­§mF*ÄÏ1çÔÜ¢¶¸¹lÂJ¦Áì´bÀ$}E½$#ËØµÜêx@Zqõ2C,Ðð°î­k,ø¸GoÝåÉ¾ú*ðêKÂ)@MGjåü~Ðe«6í¾RTø!>.\µy¼®ÃÓ¤P '«[B'w^ÞïNéK{£6óëo3AlªÍ ±Ï³soP×_g^/¾ù|= Âp¤ç§ÇÝlÆ9#*ãh÷,ÆPÊt:b\Q{¤zýêª;YK¼+§£»äÖ
JÀß£5Ç5¥ñ!(%lÔ\Ò÷0KWà*ï=}//ËÝ3¼Tïrx1æÃ}v+gÕJïm¶á¶Ô×E)[ÑØMÏîMJX>öy\Ù¾.Nâ+±f&ÆzºÚü®Íj
I÷®eæD¬êéÈ"@©6f=  #
V;¡\öXêq~-Æ×Úk~{ÈmiÍ¡¬MtAãìTóûS$|ÿ5x}ÎjûÃJ~52<8pÏº	>wÿü½CFÏê[ýkoé<j²Ê3/ýÝMÕ×36¯n´VØzß=M'£'ÚP"¹¸¥HÜÌé~ùoÊÒX4ñÜTÜþüÏ$K­|5)ÌÖúã¾Fi ^þzr¦NÂýé­´ÐÃß»nôTâ#nÏsTPÀûÕÑ\Üõ´X}ÖöäoØ­ÕtmÓk#B8y®&ýokøýcpêÿ«½ HæbÈ>º~íu6?:öèMôÚçr%;)²¿îaäó­-Hlþ/©½4¦@N¿2Ç\ÀÞÑç<¶z¬s£Ñÿí<ºè{±LÈým(ÈðUÖÅ¯Î-0U}ÑÞ÷½±èÿ5ÏÎÆÍQFkoøÞ·Ç,'rÀ÷]-£+üFèá¼ZºçÆ?ýîÿ	#[Ð*ôÝçb9¨Pýx3-zrA53lÍøjø¸e À×e¾Dk!O·}É´pË|¸µ´x~|ý¶z¦ÿoLÓÁ_úkr¦Ùh[g6;É>Æ u5×Üi,ÁüyØûµ¹TÖ ãüê*¸9Yç-ß>ü(5ï'Ë¨^d=M÷ÆÍqU·.Ï?¾lÎFZpVw!W]ÒÔEhJÝú¼5§B ÑËõ®#{3ªQ+_+ilâóËmýùq5ggS«,ù*Ø|Tü«ñZÈ
-¨PÏÏ,ôQ×= yvWG·×æÛ´h«Ï.sqQýÚÞÊÛdäÄ1_ûªÎì0PÒEíÎÏÅ=MCU¶²7òt±¿¢¦¾7³u uý|TAÖ¼$4tÍÅVÃ¶³CÇTðõL¬l½Ç,Þ7±z÷= \¥Ò´\Ø¬M~»£¶M33lÖvS3rÏÃ¬%ÛY+c±e;*Ò'.×ÓZpúÂéË«m¨e.R#K¨g¯Ý¨¯w'^ÆÃAs/®¿5ô³ÂGÝ{â×Ô&j
b:ÀÎ÷Å88¡Ô½Ð½4óûLj0ñ^3~¶Úº~Î_ÙÏtÍÅY3!³ÆvÆ´¨Ä(ôÂãR7Ä(R¡«Û^¯4Ã(8=M½0ÒÙ(ßLÙO¾½ö×ûá½1í»ùí³6íT6í[6í[6í[îwO(¾l5ò]³WÌ|x'z_Â£¨â£¤ÒÈ£¬òH# ¢Ê¨#iLä¶óOÂ3e,äµë)"ºè"¶ºh"¾â±¦âÝVçÃ¶æÓ¶çË6æÛ6çÇöæ×öçÏvæßvgÀfÐgÈfØgÄÎfÔÎgÌNfÜNgÂ®fÒ®gÊ.fÚ.gÆîfÖîgÎnfÞngÁfÑgÉfÙgÅÞfÕÞgÍ^fÝ^gÃ¾fÓ¾gË>fÛ>gÇþf×þgÏL°¢¢¸È¢´²H¢¼¨"²ªNÌæ³y¬ä±ËÙNÊÖ3ªê(#¦Úè#®úhã ¡Æãûê§KêzX#9¹iI9ìNy<ÍÑ0aòþ&©DÌy.Ðó£­Lp±ÃaæÂÝÑéæ4ÅÇKcãtëîì§'ø³åg¤ç§Y[ä%·'Z;´½%K©ÃffFsÙv¤[ÎeX;Ü»çÏsmì~®ò-X=}Oú6L»e^-p¬a³ýû³æ»ë³g¹û>(å!+í	*õ9×(ý%ù|½-UÛ+uÚ+gº=}·H ÑM²éÍZåU©3îYuH0Ï}²m0Çä½¦sYÏAºæ1ìà¶Q¦æ5)íîöÛ!¡víë&[mæ<3ÙoêÏ}cmI^~^W5}]»P³ûvÐon]£ýcè_ºV·wmñ
3ÎófN¾Ëg*eüµÝ(6UøÚ/ÐsÕê?Ö§m¦½]"7[tø'ÞoVsýúÿÀKbÑ¼¡'ät,,YË2ûÕ/Kr­>«[wå|,¿yg2JnLY¹Hoà_4ûZ;¬ûvç_QnG*Onlbù;k>9_éNÁ3]·C×zÝ#.Öow;¿eyM|^Iýy|¬¿Oq<>¢nógýlû?;XY¿mÚÕCÁ7äxs²?üxIß¬ÜÛ×Fó#§ 8Ý\%¤Ëï]ð÷Ø]=}=}õÛÙ]úª:SÛ÷÷wLj?ï,¯ó\eý¾¨TÆ²= 3HÆ³Pµ°è¾I <ãàQÐSÕf±¢Å~À#5Eø±¬{ExP¢µÁ²ÊYô¥°5¥eµ>²H@²Ì÷ÃWÏ+ gÉáÍqa¦Åí
|ªäâ¥ôè>%ièKî»TY#9I;S+ óÖ#ö1ZÖW@R$A°­,û4  ;g]°ÇÎ= ·¸ARAµ?ºCÔg®YS9Â7PVºðßô0lòGa(=Mw§äuPMvÂó·È8¬Dµ÷ýQ<GM'Ï .÷ êó 4¥©"ØØCÂícC ®¹&ö= ó#ài=M¾&zØðMñ6}c!Ó¥BîÐ²¬ëÓpaá«Tú@÷·Â6eh¾P\éêK'6(©éffÂºYn_ºZ5;ÁxKxüåAº·D»2ùP%@t2|<âØÚZnßS*ðyÕnT:Û½àílîðØZtC(}¸LÀ¥  ¸ÀÝ3-àº= ZbÑ 6ì¼Ç Ü¤°Ç³ =M¸ïÅ ¹âð7¤= ÊA^X«À:«ÁoX!'gnó(èï]@tµøA\ZBx¿AîÝ~þxräÐV6õ¡Ô&A¼¤G6æ8FÊwMóêð5= {M;ñèiÙkÀÿm1,[Épy×Ay¿ùRËPÏBôº0D|ýô¡äÅ©á#JÏ¢||Eo;Ð%ÀXñ·¹r
%y·Ã%°\<ÜÆÈBÐkF<éCeæøY/û
h|°)Îá¢Ú?ÄD~ñÐDwý®b¼Õâ3¢ÙÌÓ;mõâîlÁ±ÝzX,QË_S¥¤úý6ËÂU¯¥|n©,ÌÊ×­2?Üs²¡»Ûæ8ÀÆKïH8÷nò!Ýef¶oe\ï¨?ðåµw¨! W¦ªÈx!ä_ÌÓr¨¹Éë»s»:XgúZó!gliøyðÊÐX+INñêvT«µÍk.a;]Qpó4taÅ­»¥]:h ìOñ´ç^ñ$;»ñÇß»§¸S~3â7P= Jëï:2óÆ8Ñ3´mQ÷jÇ½X ÝüÅ¯ÏnÎï^ôÉÏ¯Nrrºùó)]ñ^G\8H×PÕyPèÿvÀÓïpÙ[ÈvªÀmèc @þ®ÐýÈÉ£h~àQö^>ú¶_b¾Ã¡[.Di/ªDÙp|"«"jt©@'Jðì½ ¥Í-ÑQO¥Èè»& Úð"kU­oûA'ß= ×Ê.Ä)¯ÈÆPÌUs Ù!ê¡é3]G±µÏ±ëª¼ÅWÿ(ÕÄ]Õuo¨~}]1>T iXvö­w|¬líþ\Ý¾4Ó¸Í-©Þ>Õñsz£e2?X5ýG(Æ~%.=}·ÄC/¼!køð['^>®lFM;$»îXkÑ÷xþl	w]<?o~PRÞ<÷U¶véaNnÃ"¢æF¶1çBjÒJ¯&÷ß\:3ìÎ;m'7õj¹H®mG#K3þÞÝ¿võéÉD2.Ke=}î7lk¿yhV!»õÏ+}J¦h}!é@<@ öþ-áYêì~±D¹Bw(§ÞnAHyI¨jvãï~µF»tþö§w/£Ó_½ '3s=}áÏç'¹"´ù.Øêð¹RsËJM!´%ú"óAÆ»IÇ*²GþZ= ´'K[8jd1npÈïs" [«2[µpT&u©Fª.4}VJt/
õóË;wu°xydkc,2 .?ïk%°y[Á°º#î¿^þÎµ+dcì(ÇÞFPfØâÚ>w²j"!ókEV1Æ©Y£/ÛyÙq6*ÐåZ°GÁ¼nÚW³^k­oä}4¡
,ì*~V/sPéÌ3¦Î¡ª±fyÒèCA=}QsZÎ6e¾ÈaL¯æ4äèÞB×7ÁNÉ¯Xé7-ð'ÞnÎ\Çî2xùu5+6Ôòkgq~Ù®¸ÞW=}}1lOÛh¿3X{JøÌ	oí½=M->>ú-[^ràvKøCXý5þf=M'7N¯ô¤åñ¹ãô9¥^Y=}¾¹!uE{l´©ùüÁÁåóIÿ«ØZ²%\~W/Û½êçHoþ^GÕ4Òl,*þÓ}ô/fõeÇUG½&9æÉËkºÀ<hýèÿþ,Öàbþà´g¢pÍ0E·±  Óp	´ñÀëÛ¨{7_§AÖoitªíuDVÔæïòpÄÃ©äÃ»( \= ¿ $#8O <Â
³;6·¥GxixÁ½
óS»ò-b¢ý\lp#u®KOlZËÍqöÕàÂu¾Å¹iZ#ýôÚ»Ì+½,÷ÕÉ^?-,?^Õ# _O´îèY]º4Î1-lk.¦ËgM²öd= >_fçöéëÌ
ð¢+×¬»56æx ÞE9éí{Åú­kjVM¼þTþ½J2~¾ôS)¸¡X=}íkFµuKrý@µ> 2Á¬G?R|£ç\ p¯}¼?ËN^oUÊ^wÞ+É¯Òçö_ª"o%öüÓípÜÓï8|n8ak47µÆIVÐc£¹¯ú5³§'·¬°]6NøyPã+fóF\æ5Õ2³äpñéÏVVU6Cwí[fFØÌ9©Ó[6M= þ×[öØ[M=}1½%{ßÚË£;Ë	÷Ë³ÞË£<m%]ý%Òè)dÂZ;ÄÈ^¡EÒä¹RRJEÒaCUb]æiÞ½RoH£Ò+%ýóRuW$Áw%§ËÆ¾õR7$&SÿË'Û¶$ûðÓz,±@sÉó7ïÝz¦÷¡ûò÷.LiÍUl~d(ÃpðºuÍuñ¬ìJh¶åÅ~ûÛ)£}SÜ8"õ'ÒkEGÔßÊÈ*BÎrkç¸YÁÑlÙÃy¸.^Ê U9¤î,Í¡½¢OFü# *á'B2i>®RK9<Jãïå¾ËîpòÇ¡YÙÅto/$zÕaªF>Ô1²ÈM)µZn¨´l¸"aj}4þSÅEKvZô=}«tÒpx=M= pçAó?÷~ôkäß£{?2?OdØ¼ÍO,Þ¶Íô¢eïQÃ~úré¬Û8Ô'ãXô-/|å-¹ïÜ¯w­ýr¿A¿]ßó_÷¾Æ<c¹Â®ÿ¤W_$ÜLy/Àg8= TAY=MîrKævAÌÁÞ@E×î«ø²Ú0<àÃËA/?ÖUéýÇCEò~»µÛ,AÇè¸ Ák!áa¸o;êØZÐCêµ·¯*	_#Fþ>µ}T'föûµf_Ôü:%b[þÎóÕ<ÎÕqPÑÅ¾ª6}ÓÒüÏIAýÊÆLÐr§ÊÉ¥Ú¨1(¬BqøkË
ðSãØ(ÛD{ô[ÞÈðÑ¡5ÎkØHO*ðØÀ6ÛõX²K;r±MOg§yheþµ>sG,ù×eâ9½¥é9ØHEjÓdàCx±¹ÿNæH~ìz©2IÍg:¬ZîN¢¶ª.Ù´9É@Ìô³)/×= ÷ÄÁCôÍ{¨>Á;úØç°eëºìÍG§¸²Cô4§SXÆ7.é<?ÊBÔVuËåBMÎ¼'àù§Ùµ¨1·Ø ÌB-÷19'Èäë{ÄîÈ ²²GFLYOègøF=}	ãIl¸Eÿ¥/é1\²
%uv¹F07²"9^­OÇ#Hw	¢tí¤58÷¤dÈ]£ØÝNíå¸
Öa$ïcéK/ò¦ª ¯¡øéÃX]¡,-A,²æX9 zÑÜÇö Â§3hX© É}qnOãþZxaòI3>>lþdÃØÊk<)Õø£>ù±ÉiE'úÏ.Îv$3.§·&ûpKP93]ÙX\}¹î<ínÕ	«Í9â¶Sgú®|jLdN=MoþºòµG¾oøh@@v¼6Çg&«mXÙîK¨ãÛo6áýïæ¯5f=}µg¦ØQy¥q8NPe$D%¡_×Ú0JHSÊóÂkLH´C= ©]Æ2ë=M§ÍðH·FkEø8geañ$tÇNt1|}¸]= ±¬¨MZ#±çVßÇò¯ø¤ËÇÐRçû&GoM°¦úãT~!¤5Ê<¡$\LøcALÜº9°c°*]Æçw'tÚ¿nmÇa>ì)jÃõ6-j=MzÇ¯úwbjN8µmÉÈÄþiÎ_]ùpÆö#å{îÌÌmJ
®ônX4NhÔôB+ý§F¥÷ä_)7lÀÂÌû¶êÇî»6eU6¶ß-¹= \KÛÑÝ[cÌ©îA	[M©i]ÿ
æ¶b ?|ù:^ ÷zèÍtñ"GN«:li(ïôÓÖlèBd¯=MéáQ)=Mèñ9¡Z6ÙR (uºL9Þ¯í{§µ/}£ÕäN|}©õ©~¿Áp Ð¬[6í{?ì[6í[õ6í[6í[66¼Vc¤ßË	µhÖ!¶7ò¤¡aØÂA:â\±\Ø@ðo¼R·gRK§IMÙ<qJ àÃº¯\Òy3¶Éd­Íäù¼i3cèTamxènIÅ² yïáÄ5pvÉ°
ÅL<@,Ø¿T÷zrKUÅÞxéû°ú»ù_Ý_hÌeÍ§¤¹Ð9S6M4á!ÕÝ­Ù}Pîé&[åBÂ»£¤¦rj¾eõ:ßPaÍrËµY "N+îêì9#æ4ë!©O"òä^áöý×ÊrÝy¿êmÿ¹øyÚþ?}Éÿ>ó l«ÓüÁ^rÃ¾wÃ}WøßÿABÏ©KýÈ·û¼>øõîð©i2¿ð±ýÏbó<7Ç8=}b çKvb.;)³[É2y =}üØ23<ÕÚJ_=}XTé¾ï-æ3iJ¤Ïe_Ä=M£éFènFÇakÎ¯ÓÖßl¥úñnH÷&âÑ+hq+Î¼LªËW
}Ù¢¼¿ÙX
X=   hY6íí[Æ6í[6mö>ì7Y6múL´L¤Q=MÉ$gâ1R=M ñµk4·1Ôõ¡¯í	mó¢£éÀR´IBÍJÄ5Ð
\a¥×ý£~¯Èx#[äÙkùÒ/òÜY1"KÉ@kÙ¤86så­K9FÙ¨íM¹a+@	ùLX5óàéJÅóWÈg^bt,(=MôQZKHoHÔÿÓçl¹±ícàÓª¾f8Üê8æµU\Á×Ö%ÛîjlúÚ¯øÃ§8þÒäP5òôã2íU&vQoôÜIn¹iÆ+ühòàú!1TC ¦ìz") ^³¨'ÎkhG:ª UÍKÏÑz¬úFÖLAmsñ¢ô¢f­Ãy[°sØuH>77­6aÑsÎÔ]éª= B;m¸9Ï¡¸|¬þN>C§ðArª^U_ÀW»=}!hÇx¸o? IØ=}G1qw·ðû~DVN¿¸ôÆÂ<ø¢ ÿBàO
ÃÛÔ¦¡2GMu
ÕÂvË(u*"ÚÏ¥µA*'ßº!ÊëýT³¼ëîHOµÃ=M¹OÛbó.DYàg»ü²7GãÎôB®HlöÅ"
»îïtDß¯ÔÝsÁÿ>¯ôxCû¤5@3¹KüÂñlÒ¸2²¢PrÂ«ø6N=MAÎ#ØXî>×N¦=MÍF)(©ÈCJ¯îJÄß¶.e= 0¬EYy8.ÙnåÅ´ªFp:Ò<5ªCf-8åßöÇµâë0ì×= Øt=M¸ç_éÛÛ0K*kZ¡áTO%Ý¸)Q=M3úñË:Ù}}p= Äñ]^<A>ÑÌÚ ÆG6í[6í[6ggä[6íwåïmìWæ>tyt!cßÎKðbÿ²\¦K~¸¹¿JþÀ·íd[©+¢/g¨$e§åVoÓaòª³MUø~ßµÞÍÐçÁ0ÿ(ANÕ¸dè¢'M}Zxµjàâ$KË:lR#^É]¿j³ï"~Ø_°dJì£Ô¢ys>±©ÌÈ	µeG&¨¬µcÌ¹ZÏLù>XzËÚØråáV|ñC{é¶üp6%z§ÛrÄö|àëO-ËvÈ[X"mÈEÇÖ¹Qr^Ö¸3¶Ruë®ü:¢6ñãB·ôë\ñ~jNÕ\wä~/râÔ_û<iÏwaHÝ$cüy'9Kyq°KÓw|Q= >ñ Qû±Ê"k {Ù)ÂoJ®z2xÂ¨÷CX°Ï"ðNéÅ ?¶3¾ü¸I.¨þ?E.è¶ý
¦æúyF1Ü_Kío¸êÎDOiE3:¬·7¸WbkÄÎ
8¯L4iI,RÉAññ¶f)LÞÊ7ýç·'±Yµ»R)wLÀ0»¹oÌ¾lN$N«PÝÙÈ\3q_Í!Ó÷Wgð[ªe98fQ¹§«UüBGgó~Ã¾Çz°úØ@5Âtþ®äïÆÇNaÔLvâb¬Ëø¼'¯2%tÒú;uådÞ¨#I?kJ¹/Ý8£ª8ÒØÉTYÊÌ¼*¨ÞÜE{/Õüí)&eUxVÐ76×Ê5\i(¥l;ÚU!2"1¯õVV³ü½¸ÎîÀò7= $Æ2¶µòÑ>	e5Í|{ôÕfMä·3|;æ¼ÛÈRBnk­ô6²ãÞ«Úyµ:UEí¬üT°&[©=}_Îöøëçõþ-ìÎö=MõRx?Î-;8VYE:ÝÐiF+0÷ë;±ÿ\M" Gúû5í=}Þnv"?.¥wúiulãíßÎÇz}XßÔ¿ÇGzÙø.r$¦à·ñ sü§»HVhÁ>óì[W¤zñ*í)X|gÆÆC|¹L3	CÆwE°Î£JÆð½{YD/Æ0õE(è
I#<¼´Jï7ÇQS0¼ÆÀÿ' ÕKÝðm ÷&Âêcõ1Û¨ÄðÂMÍ¡Fª¢ª¼Å¼Oq} Eå¢¦Ñx'~¯¢.Ù	Ù¥æÃ%Â±ë	ÿØLw_	)ûª¦ÚÕÂ+=}6Ê¸^©Aü+«¤ÜX§Ás2u?ËtÌB¡¹©þÒ¾¹ÉQ²¢E9Ä
Ã3.Á©
$\£Eô%ÅÛ$ÔoF@´ÀW1A0fÍí[vX6í[Iß[6ísnY1íÏqKQø®æÂn·¦lÊáB6¦|¬æÃ8¦x6²!2w~åBnAÝ>vr¦ô°Hw³\kâPkàÕG°?AfC'7ö·àØLàëJ ,å0C00®ÄXÈDÏwÄx,ÏJÀþ¦= taÌ°Í@ÑDéq(½uø4öE¡yájmc ¶¢E¯ãqZ¾i1Øõ³©ê±øÞ=M"Xèh"¡ó§²rÑ(²Dw|cð({C#±Þá8Ñ
OV!ÏAðàCcàü+»ÐU}F¸q¼"äzã|¯¿<cß>Pyiy©¾8= a=M 'Þø§bIï7ù h3»îÊ8CÖIG¢Ü!PKá£òFã§ôt¹{ä+µöÈî3KìQ#í¾÷ëÜÉ4Âu©Ë$]7 ïëIæ¸Øè
E5¦è³ÆL?ÆXPë}¨mWÇÖ/~'º°-WÇ	4RµQsÉ»*#z"flÑÂ¶Ø¨ÃÎHÆX[-Åù
øyÂIc	{LÓX#·Á6ôb/Ç×\ºìWÚ)cW= ó^ª0K«ái:ZC6ê©ÞßÆGE:³àx>yÏsQ¾²·æ£Cô*¤æû´eÖS©±ÓoÎFËÉ8_¾ý§dpüÉcà²*#G= fÑ×	d\a¸°uÃAETÅ²þ­ÄõÉL8±Àoû)»%þ}ÃÕ-äR[ÆS4VhÆªßÇMòU¥×ÁûFRÅä­ÏK:2iæÓ¥'R$¤²ýw_)@z¦Ùr¤1e½ÍþÃ|_¯hÚzÓºu= Ý_ñÒínPbÕ·i9Dµ
É?Ä;.'R ³ôÄ~¤Ý¾ÆSl	}dç=}¬çl$d-tñ´Î'
tk,ô¡k6´°AÌöÛ'¦éº©ShßrtûMúºúúö¯$mv3©Ã¼¢'Å¤I¬é_Kîe
K¹Ïo¬NÐtv~wVi¡7Óz÷|V±î(fÎÎt» µcQnæDÌ.w>wÏÕ2ÿÞIåR7»9ØKwCµ[¿
]DF{oÕ«ss¬= Ï7_qZïg'Ý^C+vdÿZÞg÷?þBÛ=McyÉ^?yü®åÜµocRAû¼= õç@ c\Bàßí1ÝÇû?X6mäãç÷$6]06äoT1êc%6MC¹VØZ§¨= _Oc/âFònJüÏ¦wpAW&p)æüÎ÷«¾æ¯Pög+Îxò¿[>/­
OwÏd×ï'qbpÜÿÏBývp381f¼9+íØBí»s+yáSõ|õJÆÝÖNÅMÕ\b[%679nf¹{xMù¾¿BG]¿N+ÔógWfjÞgøðâµò#e­<6*÷¹ð	?+9Jg?A+ïsû|R%yNËxwv'Ü^t¿¿{güG£vüdÊ?pq>sûY?8X :Õ}}!]p8$»t^v@wÞð)oÉý2!¦}·©ñ±*ñtuàO"!Øvâ.¸ÀnHx½'|F êoØøö>Pç;¾«"YÆý+ÀòËêêjx$.´átÁ3&h= û®T=}RÇ¯ÍÃô!ýUÄ´VÏÂkwI8)³Ï&aK,ih:_=}. [¯Ó<Ó²Ç"\O¶Ú a(¥®´Ûa?-±j:u4C9avpÓö@±ÝÇ¼lK¦NØ¬òÁòóHLï'ú H@êÞðm=MF¾¾xrU-üaZnt~Þ RÀÔÆÙ£çÂ¬?àÓë¨ÖíCp\ð(XÅ úØ¤î\=M0½»EQpY{è#¸´bquÎ¼
×¤ H¦Ï¿¤bìåz»§cT{ä\ÝÓ±¼î
Ño!é[Sñ¥ªAï³àÚ	îÙxµ¯÷{åãH"ì,idÙ¹Øz³Ý²ó¡ÿ¾ùý¦tr1òÕ¾ê>eÃ«$·êP²:Ý3ÑPØÃE¢(å¡= ÔzËk§Áø³ÈðßÅ
<È©lK$ð?ªE~²ô7aÀ:«JåXY C'÷²d íªàð]¼yKü]¡àÜ@R¶ÛoøuÜÀ\ÇÃþ|C²xyýè[ãtÔ4ºÅ ýtºåôð1ziKÎËIKÉÊuR²PÍÅ¤ÓÈEd0. ®gÓy´Ì·llòéß9ä1ÿeZçR°}_»J/'RVò±Ù%,ß²¥Ê$±n4fÁ=}Ï¥v´ÄQs¤V§Ù¨éµSlÁdmÀs}èá©I=}¨7C¶_ö£yÝ:õM	U»ä?¬1¡K«êèÁ¯¿~eÙ¥P^aSépI©´G÷é¿·$ùz{Ó&êÑUÛõ:.Ê'jèm±®ßÍÎª£É§á-\¾6\ÀÅCz	ÅïzWLmÊzöÿØðF·6öy&6}3½tþ@Üö]zwßÝáÅí{µ0ûÚçÙz{Úö|p±v£e«ÑXEÖTïæÙIå¬%WÚö>ô+SÝ@ÎIjRò2	àZV^lÓzìL´Nj2­s>}f'Ë=Mþ¥º£?¨:¹ph.ÿhGz"Z½n"XqãÅk{¶kì·³¿ÿ5Ú_¦#VÚç-Ë	&üU Ðy'yr Ûdb®×É8¡÷kwÑ^iY.N?ÜÓfÛríf¼¦I;®pc­Q\ãïº7]¯e<çsrzü q¾4êkÖA6ß¿4§~¹HõíÎpkEk½Gï]ïdÛ;õð[Wø~~îò§OµúFÏ)<a{þbügÂ:@X"îÍh	=Mú£(.>, ¡pµ­í£1'äZuFãìD)JX]ÝG×ê û¶j¶jâeðTL¶FÉ¸n±>;&#sìMºáº¬0p=M<ÇY¢ç½î:¸¢¹HCÝñ¸HLU&ùcpÈßä>rCyj,!]¸ÑOÂá<¬z¿ÒG4VGb¨»0=}Ï´£a3§
/E¨ÔÏÃ ×ºöçç þÑ¦uÙø2±+×fÀÖµÑù8ìC¨/«@¨Ù¡ÖéáÀãC¥8rÌQ	Ò0»ÒØXI°þMåðåÊ[­àýk|0mþ×õÔ:Á æµçHhW¡©Qñi¬­"&ô9ºJ#OSóhJT¬j]§^Ì%ïÆ©4ìÎ¢£ocQ´ëå9¹mUÀjF|È7XâK\¨ì=Mµ§[Ñý[§¢ ÂÊénúÑ.Î-Äâ}ñY´8&ý©9ß²Øt]9|=}ûÏï2íGÛY<(³LmEÑ&c3ùÖ2ß-ËxQVZL"ª¼Gôöi~øvN7«ÊèÉ:ì)}ð=M[Òã~¡O/¦Æt.6fÔ4¼¾ô;ü8|6<[^¼ËÐeÓx}.aI*Lasû,dÓZªxI¾9É¾6h¼.k= ­/oð·Oø]ÏüYI®P¨hµe~Øüàb´Æ!:ä¼VÖFÇðú!?ËÆ®
6&xUBpó
µêl¡]hÙk]!e=MªÍÿÄB°ÅÄâÐá.§G#WT¤¨ÞÉAÎg´Ìß(j¬´LAÈÙ¾«ÀùÕa?×@oüÿ®E@}²ä[ôÐÀkëa¯#r¤Éá8^Y6]];»6'úì[6í[6í[6í[¶j¦jZoç¶¼|B½¥ä%ÂP¼×' ÷£ìÊÅº^_L_K_4C¿Ã¾o@¸ Àÿè¤Hy É ô:|w¤q±0v@Àpâªø7rµl¯{a_}xKïÿàðO?  ¤¢¢¡¥£' $""!%#çàäâq¬,ìlXOþFÓP°°cY¸8øøyE¤$ääeU´4ôôu=MM¬,ììm1ßâHhÙ8Ä¤ädÔU5ôÌL-ìmÜ¼ü|ÂC#âÒR3òsÊþ}fÒQ±64÷utÊÈK©¬-*ëlhÝÚ[¼¸;y|çÚ¥Ã»/P8t|r:.)ÿåW6q	Ì«*ékß_;~zÇª­³Ço= h$L|R*zNA	y5C3þ%tr*Ú&7/_Eñë¸Æd¶­½<}ÜÀ_»%úàe|½
Íàêù{xjQ][¯|³G÷^¤öÈì=}øÌA½;ç{Í¢JQ=}·H<rß'Qè\øN >{dõª=MEWi=Mz¯ß-ßãñ¨_Ð(ÄÄÕÕÕññ&»Co(ÃD@@ÀûûÅ *Â´µµÕÔdú³ñÀtvv¶µ= 1Õ(¦z±(ÞÄ×××íí![t¯MMMù¾°&Uèïï/)©pE¿ Á¨Äoò­[Fí­[6í[6í[Ú6¹{[6qÞ AT;ôG{T÷uYvs.)FÓÝæ Kxæ3GÈe°ñ<%<k¬Oº>'gìG¹²ºN7fäQÔ÷UYFoôs]8ÆÎ'í²q"®2¨xÆ2Èf Ñ<$4+¬Mª>&'ìE©RºJæåaÔöYDOôr8ÄÖ§îÞæÏí÷ÙÝ|Í¯ïZdõqÊÿnÑHyâ¾lþYvw)N³ÜîKyf7¹GÉmð	q<#k-@úþ =}gíOù²¹^÷fâº±Tð;µXNô·DnKiFA¼"­Fâ¾!1íLá»XÇ&ã´/¨cêK0ïèméÛóôvYÌÕ\ì¶s=}ìç®MIÆY¤ÐG]Vá·P[ÛvfyíÉ@ý;@B¬= Ãø@ 	<ïÆp.0¤«x0§ÈcÒQÖä¿RAö= à(9Á¬µ]áÍöp§½<î.[F¡¼&8Ë¬N¾%	ÇìBÒ¸DG&ç/©kK2ïéc[ðtq5YÂ¤Õ]âÕ6p«Ý<â.]©Æ¹¤ÒW½VåRG[va¶yã"ÉH
8P¢¬d£úP¤)ýà£ùÁ©×Ú
üÅËÏZ¸Ræá¢áÔò#XHÏôt"9È§ææÇ­÷Ú|ÅÏïXdñ&ñ&ä¨Ï¨aÒË0OèjÑòu	KJ9Vò,e»ZúV6¥ãýã&Åµ7Ú=M-|Æ×/Z+dð*Ñà®oÑO=}Vã¯QW»vekÚPá;Y6í[Kì[6¿kEì[6m'=M_6íU)'Z¦q­Ò(ÃK¯Ë³Ô0áF{ýaªJêÜ^Û~*}WØô:)"obÎÅ5¢=}
6®*Q:­ÿ§2Ï«¨ÞMÅ<o#ÀwªÎÌ¯cvmtû6÷1Õ);ùSJq×÷ S¯sÏ óý	*[pikÈØéE_éÔf1ÛóÓè³F_È[ñ>Ä£ÌY6ÌË=M1ú°,¹Â¥½F¹¢=MÙë/Ôì=M/Ý'$É<;Ë»ìB= Ï(ÉnÞq[ú¼ÿ£èA6õ({Âû,Ï=}ßTPçµþB*Ê+ðô¹ÕÚ	D5Þ$¿3÷õÔ$N²è´áô= = ÚÃ-³!U¤;[çk3yscÊÅg!ÞÐÑ>¼âÌÊpE­3ò6´·ø¶&ue8g´øt)H1iÓr{+p:Êq+1(·5­µ¹-aø|í×;Wß.uø÷YQòYDèÞ/[»C'M¸uNtR¡p×ë"E8öü¨+?ö= &Ï{ È¬vÏ·7ÏÝä4³© á:  
áj,ëûG¸èrO½/Oçyn|¦?½IÿÏ=MTºµÓ{tÈ/S³=}OeLYNuLYOYel]NYul]ÏIbäìÎÆIjälÎIò²Í6ñ2L}°á¶C¨,ÙXC0&á»Cú}¸F	8±Dñ¦nÃñé
ÛcØÜgb^¸GI8¹FUñ¶nCñù[cøÜgc~¹¹û
i°â¨! A ø¡(]tÜyå%IH2òÙö®ÃKRåêY:­ë9åo²8¬Þ¦M¯#KjY½oßüG.Yu¼;ÞO.w3ë½ö-O.}X5¿;NC.s1k<lº¿;nC.{1k>l:¿;fA.y0ëÞl;fI.y2ë^l¿;rà×¾lJÝy1«ÏöeK.<Y¿;z@.þ0+¯lj;zD.þ1+ïlj;zH.þ2+/lj¯;zL.þ3+olj¿;¼0K;<0K;¼1K;<1K;¼2K§;<2k[_sWø-wø/µ,åÍë[CÞv47³¸³¹³º+³»;»8»9»:+»;;=M%-5=}ä¡YHÈÖ²å©ÓYJØV²=}hÎhh
NhiÎiiNij"Îj&j*Nj.k2Îk6k:Nk¾¬°A£,°CÃ¬±Eã,±G¬²I¦#,²Kns~Ø$ã«á!0Ï[2çßr Dt}O{s}|¿gMyó_\¿sLü·sçlý3ÿøÏøßøïøÿüDÏüEßüFïüGÿúÈi¥}$'t^R_ã1èá b,¢Pä­ËNC~:\ãn³w{M½g>óo9l¡{HÞ2l©{J^2?l±{LÞ3_l¹{N^3øbÅ|§q¥^DøbÕ|
çq­^E?øcå|'qµ^F_øcõ|gq½^Gt ýÈ¯Rt¤ýÉïRt¨ýÊ/R/t¬ýËoR?t°ýÌ¯SOt´ýÍï»>}!u¸ýÎ/Sot¼ýÏoSá9 söz7rÃbø¡þ§bø£~Çbø¥þ	çbø§~	b#ø©þ
'b+ø«~
Gb3ø­þgb;ø¯~cCø±þ§cKø³~ÇcSøµþ=Mçc[ø·~=Mccø¹þ'ckø»~Gcsø½þgc{ø¿~Orü¡ÿH§rü£HÇf§syKüæþ³_LfÇs%ySüêþµ_ÿMGfçs5y[üîþ·_MgsEycüòþ¹_¼¼½¿½ß½ÿ½½?ý>{¾Áp ìç[6í[6í[6í[6í[ÆöÏè#,>V:«-:FZk-<Zk,?*è =MJ(!	z( :¨ÐÒÕ5UÓÙµµUÑßUUÒ×Ê)&öú©'æºi'úÚi&ÈqSOºw$ÓO¸{<Ï»ssÏ¢2I£´²I¡RI¢É&á6ù¦æ&¹fâ:Ùf°)T²J®/dRJ¬'|ÒÊ¯+\¥>rzÛo>tjï?wrëï>s~Ë,2A¶û¬3F¦»l3BºÛl2àIÕ·\öOåW\ôGý×Ü÷KÝ®5ZÆ[m5\Úm4_Êkí5["¥ÐA¼ÁpÁ¬ðÁ ¤*â§2èâ
£>¨"¥.Â£lpÂ­LðB¥t0BR(ã½^H#=M¹Nx#¾V8£ÆìÜg\ÇaX)[©#Z
ë[6í;ç[6ïü3÷ìmà±V>³/ñrû_cGzZÚBI¢ÎðÍçJyOÿn~ÁäSjÚÏÿ~3p§=}Î£ÄAå\ÊàW?þð+ýÌ= 2î0Û?Áð+Ã¸?ð¸MÕ¦ÌFAå»\êá7þ)0áæxÑBÐ±CËLCÞl°C=Møxh Õ@Ä­àZFªÐ®g0M]´b-ôY &à,eÊð&
ÜÚAÉÒ%àß|ò­¸JZ£ôÂ§gõeGÑO~ºóm'ô¾Fí</fÑ¸\¬´ AXð®¨A 
^Â´·Ä°ØÁYù¾íPÇÆ¬4!Ç¼®W­ThÁGlâÌïÅÐt	Ä#DÓ	§kx ½yüB?~¡2{¾l¸ploÔa§dËdídådéäYÂÅÇ3]ÇHFyñNö¿ùöø_m$}v¯ý»¶¾¶º$NÕ9+¼ÕnOöÐ³ Ùb­qv}ßbüHzvÉTåU2äÞ1­Û,ËÉYõv²ÇÙ)=}¼=}²#©!«æÌ³!,W;ã]ÅyåûéÎÅÞ5=}Z^-ÐKå;~{¯óÞãýÌv½c£æhGAt,ÆûùÎåÞ%;<DÛÞZPX¸ì´ìHEuª±)"º1ÝW)m±)zÕý*©^ÿ­ð«h|ø{kF4¯0¿ÎhI©ñÖ&efÖ¹ò[c»­&ëí¾öÉs8ôËX ÷iôcõiÝzÞM0áÒ²&NÊ×äA!Ï½~´ou= w|>dþIú;irñJ =} (0* µ9®7®#¹/³7_ºâ¶=M-+Qkjg¤{Bú)5= L	(ÜÕ×ºÓ0¼ö!ß\zMÌp_oYW¯°¸´GÅâ	ÄªIqÅ%oe²ëñ´ò]w`});

  var HEAPU8, wasmMemory, buffer;

  function updateGlobalBufferAndViews(b) {
   buffer = b;
   HEAPU8 = new Uint8Array(b);
  }

  function JS_cos(x) {
   return Math.cos(x);
  }

  function JS_exp(x) {
   return Math.exp(x);
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

  var asmLibraryArg = {
   "b": JS_cos,
   "a": JS_exp,
   "c": _emscripten_memcpy_big,
   "d": _emscripten_resize_heap
  };

  function initRuntime(asm) {
   asm["f"]();
  }

  var imports = {
   "a": asmLibraryArg
  };

  var _opus_frame_decoder_create, _malloc, _opus_frame_decode_float_deinterleaved, _opus_frame_decoder_destroy, _free;


  this.setModule = (data) => {
    WASMAudioDecoderCommon.setModule(EmscriptenWASM, data);
  };

  this.getModule = () =>
    WASMAudioDecoderCommon.getModule(EmscriptenWASM);

  this.instantiate = () => {
    this.getModule().then((wasm) => WebAssembly.instantiate(wasm, imports)).then((instance) => {
      var asm = instance.exports;
   _opus_frame_decoder_create = asm["g"];
   _malloc = asm["h"];
   _opus_frame_decode_float_deinterleaved = asm["i"];
   _opus_frame_decoder_destroy = asm["j"];
   _free = asm["k"];
   wasmMemory = asm["e"];
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
   this._opus_frame_decoder_create = _opus_frame_decoder_create;
   this._opus_frame_decode_float_deinterleaved = _opus_frame_decode_float_deinterleaved;
   this._opus_frame_decoder_destroy = _opus_frame_decoder_destroy;
  });
  return this;
  };}

  function OpusDecoder(options = {}) {
    // static properties
    if (!OpusDecoder.errors) {
      // prettier-ignore
      Object.defineProperties(OpusDecoder, {
        errors: {
          value: new Map([
            [-1, "OPUS_BAD_ARG: One or more invalid/out of range arguments"],
            [-2, "OPUS_BUFFER_TOO_SMALL: Not enough bytes allocated in the buffer"],
            [-3, "OPUS_INTERNAL_ERROR: An internal error was detected"],
            [-4, "OPUS_INVALID_PACKET: The compressed data passed is corrupted"],
            [-5, "OPUS_UNIMPLEMENTED: Invalid/unsupported request number"],
            [-6, "OPUS_INVALID_STATE: An encoder or decoder structure is invalid or already freed"],
            [-7, "OPUS_ALLOC_FAIL: Memory allocation has failed"],
          ]),
        },
      });
    }

    // injects dependencies when running as a web worker
    // async
    this._init = () => {
      return new this._WASMAudioDecoderCommon(this)
        .instantiate()
        .then((common) => {
          this._common = common;

          const mapping = this._common.allocateTypedArray(
            this._channels,
            Uint8Array
          );

          mapping.buf.set(this._channelMappingTable);

          this._decoder = this._common.wasm._opus_frame_decoder_create(
            this._channels,
            this._streamCount,
            this._coupledStreamCount,
            mapping.ptr,
            this._preSkip
          );
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
      this._common.wasm._opus_frame_decoder_destroy(this._decoder);

      this._common.free();
    };

    this._decode = (opusFrame) => {
      if (!(opusFrame instanceof Uint8Array))
        throw Error(
          "Data to decode must be Uint8Array. Instead got " + typeof opusFrame
        );

      this._input.buf.set(opusFrame);

      const samplesDecoded =
        this._common.wasm._opus_frame_decode_float_deinterleaved(
          this._decoder,
          this._input.ptr,
          opusFrame.length,
          this._output.ptr
        );

      if (samplesDecoded < 0) {
        console.error(
          "libopus " +
            samplesDecoded +
            " " +
            (OpusDecoder.errors.get(samplesDecoded) || "Unknown Error")
        );
        return 0;
      }
      return samplesDecoded;
    };

    this.decodeFrame = (opusFrame) => {
      const samplesDecoded = this._decode(opusFrame);

      return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
        this._output.buf,
        this._channels,
        samplesDecoded,
        48000
      );
    };

    this.decodeFrames = (opusFrames) => {
      let outputBuffers = [],
        outputSamples = 0,
        i = 0;

      while (i < opusFrames.length) {
        const samplesDecoded = this._decode(opusFrames[i++]);

        outputBuffers.push(
          this._common.getOutputChannels(
            this._output.buf,
            this._channels,
            samplesDecoded
          )
        );
        outputSamples += samplesDecoded;
      }

      const data = this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
        outputBuffers,
        this._channels,
        outputSamples,
        48000
      );

      return data;
    };

    // injects dependencies when running as a web worker
    this._isWebWorker = OpusDecoder.isWebWorker;
    this._WASMAudioDecoderCommon =
      OpusDecoder.WASMAudioDecoderCommon || WASMAudioDecoderCommon;
    this._EmscriptenWASM = OpusDecoder.EmscriptenWASM || EmscriptenWASM;
    this._module = OpusDecoder.module;

    const isNumber = (param) => typeof param === "number";

    const channels = options.channels;
    const streamCount = options.streamCount;
    const coupledStreamCount = options.coupledStreamCount;
    const channelMappingTable = options.channelMappingTable;
    const preSkip = options.preSkip;

    // channel mapping family >= 1
    if (
      channels > 2 &&
      (!isNumber(streamCount) ||
        !isNumber(coupledStreamCount) ||
        !Array.isArray(channelMappingTable))
    ) {
      throw new Error("Invalid Opus Decoder Options for multichannel decoding.");
    }

    // channel mapping family 0
    this._channels = isNumber(channels) ? channels : 2;
    this._streamCount = isNumber(streamCount) ? streamCount : 1;
    this._coupledStreamCount = isNumber(coupledStreamCount)
      ? coupledStreamCount
      : this._channels - 1;
    this._channelMappingTable =
      channelMappingTable || (this._channels === 2 ? [0, 1] : [0]);
    this._preSkip = preSkip || 0;

    this._inputSize = 32000 * 0.12 * this._channels; // 256kbs per channel
    this._outputChannelSize = 120 * 48;
    this._outputChannels = this._channels;

    this._ready = this._init();

    return this;
  }

  class OpusDecoderWebWorker extends WASMAudioDecoderWorker {
    constructor(options) {
      super(options, "opus-decoder", OpusDecoder, EmscriptenWASM);
    }

    async decodeFrame(data) {
      return this._postToDecoder("decodeFrame", data);
    }

    async decodeFrames(data) {
      return this._postToDecoder("decodeFrames", data);
    }
  }

  exports.OpusDecoder = OpusDecoder;
  exports.OpusDecoderWebWorker = OpusDecoderWebWorker;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
