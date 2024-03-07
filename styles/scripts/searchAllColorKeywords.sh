#!/bin/bash

# Directory to search
SEARCH_DIR="src/pages/Swap"

# Color codes to search for
declare -a colorCodes=(
"White1000"
"Basic1000"
"Basic800"
"Basic600"
"Basic400"
"Basic300"
"Basic200"
"Basic100"
"Yellow600"
"Yellow400"
"Yellow200"
"Green600"
"Red600"
"Grey700"
"Grey600"
"Grey500"
"Grey400"
"Blue500"
"border"
"active"
"formBackground"
"light"
"dark"
"buttonBgColor"
"Basic900"
"Purple800"
"Purple600"
"Purple500"
"Blue"
"Red"
"Red500"
"Orange500"
"Green500"
"StandardBlack"
"StandardWhite"
"Background"
"Green"
"Black"
"BlackTxt"
"barBg"
"inputBorder"
"textColor"
"buttonHoverBgColor"
)

# Loop through color codes and search in the directory
for code in "${colorCodes[@]}"
do
    echo "Searching for: $code"
    grep -Rin "$code" "$SEARCH_DIR"
    echo "----------------------------------------"
done
