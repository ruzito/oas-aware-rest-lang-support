// This file was generated by lezer-generator. You probably shouldn't edit it.
import {LRParser} from "@lezer/lr"
import {jsonHighlighting} from "./highlight"
export const parser = LRParser.deserialize({
  version: 14,
  states: "%WOQOPOOOOOO'#C_'#C_OVOPO'#C^O[OPOOOaOQO,58xOfOSOOOOOO'#C`'#C`OqOPO1G.dOOOO'#Ci'#CiOvOSO'#ChO!OOPO'#CfO!OOPO'#CfQOOOOOO!WOPO7+$OOOOO-E6g-E6gOOOO,59S,59SOOOO-E6f-E6fO!]OPO,59QOOOO'#Ca'#CaO!eOPO<<GjO!jOWOAN=UOOOO'#Cd'#CdO!rOPO'#CcO!wOPO'#CgO!|OWO'#CbO#UOPOG22pO#ZOWO,58}OOOO,59R,59ROOOO-E6e-E6eOOOOLD([LD([OOOO'#Ce'#CeOOOO1G.i1G.i",
  stateData: "#`~O`PO~OaSO~OgTO~ObUO~OdWOhZO^YP~Oa]O~OdWOh_O~OdWO^YX~OcbO~OdWO^Ya~OddO~OeeOdUP~OfjO~OdkO~OeeOdUX~OdmO~OenO~O",
  goto: "!g^PP_behknrvy|!S!^RRORQORVSRc]RidTgdhTfdhRojR[TQhdRlhQYTS`YaRaZWXTYZaR^X",
  nodeNames: "⚠ Request HttpPart Method Path Version Headers Header HeaderKey HeaderValue Body",
  maxTerm: 24,
  propSources: [jsonHighlighting],
  skippedNodes: [0],
  repeatNodeCount: 3,
  tokenData: ":}~RbOY!ZYZ${Zp!Zpq%Qq}!Z}!O%m!O![!Z![!](Y!]!f!Z!f!g)W!g!i!Z!i!j.W!j!k/x!k!r!Z!r!s6f!s;'S!Z;'S;=`$u<%lO!Z^!dWeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z[#TUeWhSOY!|Z![!|![!]#g!];'S!|;'S;=`$O<%lO!|S#lShSOY#gZ;'S#g;'S;=`#x<%lO#gS#{P;=`<%l#g[$RP;=`<%l!|U$]UhSbQOY$UZp$Upq#gq;'S$U;'S;=`$o<%lO$UU$rP;=`<%l$U^$xP;=`<%l!Z~%QOd~]%ZUaPeWhSOY!|Z![!|![!]#g!];'S!|;'S;=`$O<%lO!|_%vYeWhSbQOY!ZZp!Zpq!|q}!Z}!O&f!O![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z_&oYeWhSbQOY!ZZp!Zpq!|q}!Z}!O'_!O![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z_'jYeWhSbQgPOY!ZZp!Zpq!|q}!Z}!O'_!O![!Z![!]$U!];'S!Z;'S;=`$u<%lO!ZV(aUhSbQOY$UZp$Upq(sq;'S$U;'S;=`$o<%lO$UT(zSfPhSOY#gZ;'S#g;'S;=`#x<%lO#g_)aYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!g!Z!g!h*P!h;'S!Z;'S;=`$u<%lO!Z_*YYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!n!Z!n!o*x!o;'S!Z;'S;=`$u<%lO!Z_+RYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!g!Z!g!h+q!h;'S!Z;'S;=`$u<%lO!Z_+zYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!v!Z!v!w,j!w;'S!Z;'S;=`$u<%lO!Z_,sYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!g!Z!g!h-c!h;'S!Z;'S;=`$u<%lO!Z_-nWeWhS`PbQOY!ZZp!Zpq!|q![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z_.aYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!g!Z!g!h/P!h;'S!Z;'S;=`$u<%lO!Z_/YYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!v!Z!v!w-c!w;'S!Z;'S;=`$u<%lO!Z_0RYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!v!Z!v!w0q!w;'S!Z;'S;=`$u<%lO!Z_0zYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!v!Z!v!w1j!w;'S!Z;'S;=`$u<%lO!Z_1sYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!r!Z!r!s2c!s;'S!Z;'S;=`$u<%lO!Z_2lYeWhSbQOY!ZZp!Zpq!|q!P!Z!P!Q3[!Q![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z_3eXeWhSbQOY!ZZp!Zpq!|q!Q!Z!Q![4Q![!]$U!];'S!Z;'S;=`$u<%lO!Z_4]YeWhSbQcPOY!ZZp!Zpq!|q!O!Z!O!P4{!P![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z_5UXeWhSbQOY!ZZp!Zpq!|q!Q!Z!Q![5q![!]$U!];'S!Z;'S;=`$u<%lO!Z_5|WeWhSbQcPOY!ZZp!Zpq!|q![!Z![!]$U!];'S!Z;'S;=`$u<%lO!Z_6o^eWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!c!Z!c!d7k!d!q!Z!q!r:U!r!w!Z!w!x/P!x;'S!Z;'S;=`$u<%lO!Z_7tYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!v!Z!v!w8d!w;'S!Z;'S;=`$u<%lO!Z_8mYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!e!Z!e!f9]!f;'S!Z;'S;=`$u<%lO!Z_9fYeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!j!Z!j!k-c!k;'S!Z;'S;=`$u<%lO!Z_:_YeWhSbQOY!ZZp!Zpq!|q![!Z![!]$U!]!u!Z!u!v/P!v;'S!Z;'S;=`$u<%lO!Z",
  tokenizers: [0, 1, 2, 3],
  topRules: {"Request":[0,1]},
  tokenPrec: 0
})
