/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/mandate.json`.
 */
export type Mandate = {
  "address": "H3tueXv6DLBhn61SzEuy3MueqGwhQfkM5yK2gyHsZDjd",
  "metadata": {
    "name": "mandate",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Mandate - living world guild game on Solana"
  },
  "instructions": [
    {
      "name": "bribeAndBetray",
      "discriminator": [
        68,
        79,
        175,
        172,
        138,
        205,
        33,
        164
      ],
      "accounts": [
        {
          "name": "character",
          "writable": true
        },
        {
          "name": "npc",
          "writable": true
        },
        {
          "name": "relationship",
          "writable": true
        },
        {
          "name": "rival",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "offer",
          "type": "u64"
        }
      ]
    },
    {
      "name": "checkEvent",
      "discriminator": [
        106,
        169,
        201,
        58,
        141,
        174,
        69,
        81
      ],
      "accounts": [
        {
          "name": "character",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createCharacter",
      "discriminator": [
        94,
        208,
        60,
        158,
        114,
        52,
        154,
        50
      ],
      "accounts": [
        {
          "name": "character",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "class",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createNpc",
      "discriminator": [
        246,
        149,
        253,
        193,
        176,
        213,
        234,
        168
      ],
      "accounts": [
        {
          "name": "npc",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u8"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "greed",
          "type": "u8"
        },
        {
          "name": "loyalty",
          "type": "u8"
        },
        {
          "name": "bond",
          "type": "u64"
        }
      ]
    },
    {
      "name": "guildJob",
      "discriminator": [
        168,
        194,
        61,
        82,
        92,
        153,
        180,
        94
      ],
      "accounts": [
        {
          "name": "character",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "hire",
      "discriminator": [
        147,
        104,
        157,
        206,
        56,
        175,
        129,
        205
      ],
      "accounts": [
        {
          "name": "character"
        },
        {
          "name": "npc",
          "writable": true
        },
        {
          "name": "relationship",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "settle",
      "discriminator": [
        175,
        42,
        185,
        87,
        144,
        131,
        102,
        212
      ],
      "accounts": [
        {
          "name": "character",
          "writable": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "character",
      "discriminator": [
        140,
        115,
        165,
        36,
        241,
        153,
        102,
        84
      ]
    },
    {
      "name": "npc",
      "discriminator": [
        68,
        83,
        157,
        72,
        230,
        229,
        125,
        134
      ]
    },
    {
      "name": "relationship",
      "discriminator": [
        89,
        169,
        213,
        122,
        174,
        249,
        5,
        251
      ]
    }
  ],
  "events": [
    {
      "name": "betrayed",
      "discriminator": [
        162,
        242,
        204,
        2,
        207,
        25,
        183,
        232
      ]
    },
    {
      "name": "eventUnlocked",
      "discriminator": [
        121,
        111,
        235,
        203,
        90,
        214,
        59,
        242
      ]
    },
    {
      "name": "hired",
      "discriminator": [
        239,
        97,
        56,
        26,
        33,
        183,
        111,
        164
      ]
    },
    {
      "name": "settled",
      "discriminator": [
        232,
        210,
        40,
        17,
        142,
        124,
        145,
        238
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidClass",
      "msg": "Class must be 0-3 (Warrior, Rogue, Merchant, Paladin)"
    },
    {
      "code": 6001,
      "name": "nameTooLong",
      "msg": "NPC name is too long"
    },
    {
      "code": 6002,
      "name": "unauthorized",
      "msg": "Only the NPC authority can do this"
    },
    {
      "code": 6003,
      "name": "npcAlreadyHired",
      "msg": "This NPC is already hired"
    },
    {
      "code": 6004,
      "name": "npcNotHiredByCharacter",
      "msg": "This NPC is not hired by this character"
    },
    {
      "code": 6005,
      "name": "alreadyBetrayed",
      "msg": "This companion already betrayed you"
    },
    {
      "code": 6006,
      "name": "bribeTooSmall",
      "msg": "Bribe must be larger than bond plus trust"
    },
    {
      "code": 6007,
      "name": "eventConditionsNotMet",
      "msg": "Event conditions not met"
    },
    {
      "code": 6008,
      "name": "overflow",
      "msg": "Math overflow"
    }
  ],
  "types": [
    {
      "name": "betrayed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "npc",
            "type": "pubkey"
          },
          {
            "name": "offer",
            "type": "u64"
          },
          {
            "name": "bondPaid",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "character",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "class",
            "type": "u8"
          },
          {
            "name": "gold",
            "type": "u64"
          },
          {
            "name": "incomePerHour",
            "type": "u64"
          },
          {
            "name": "rentPerHour",
            "type": "u64"
          },
          {
            "name": "lastUpdate",
            "type": "i64"
          },
          {
            "name": "thievesRep",
            "type": "i16"
          },
          {
            "name": "flags",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "eventUnlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "eventId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "hired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "npc",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "npc",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "greed",
            "type": "u8"
          },
          {
            "name": "loyalty",
            "type": "u8"
          },
          {
            "name": "bond",
            "type": "u64"
          },
          {
            "name": "hiredBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "relationship",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "npc",
            "type": "pubkey"
          },
          {
            "name": "character",
            "type": "pubkey"
          },
          {
            "name": "trust",
            "type": "u8"
          },
          {
            "name": "bondEscrow",
            "type": "u64"
          },
          {
            "name": "betrayed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "settled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "goldBefore",
            "type": "u64"
          },
          {
            "name": "goldAfter",
            "type": "u64"
          },
          {
            "name": "hours",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
