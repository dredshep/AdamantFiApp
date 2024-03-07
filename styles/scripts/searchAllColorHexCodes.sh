#!/bin/bash

grep -RinE '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b' src/pages/Swap src/themes
