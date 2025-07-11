#!/bin/sh

TIMES=1
while getopts 'gct:d:' ARG; do
  case $ARG in
  g)
    GLOBAL=true
    ;;
  c)
    # Criteria
    CRITERIA=true
    ;;
  t)
    TIMES="$OPTARG"
    echo "$TIMES" | grep -E '^[0-9]+$' || { echo "Invalid times to run: $TIMES"; exit 1; }
    ;;
  d)
    echo "$OPTARG" | grep -E '^[0-9]+$' || { echo "Invalid run transfer max len: $OPTARG"; exit 1; }
    FOOT_DISTANCE="--fp-run-len $OPTARG"
    ;;
  *)
    echo "Options are: -g (global) -c (criteria) -t <number> (times to run)"
    exit 1
    ;;
  esac
done

shift $((OPTIND - 1))

echo "Running $TIMES time(s)"

pnpm run build
mkdir bench 2>/dev/null || true

if [ -n "$GLOBAL" ]; then
  for INSTANCE in \
    'r' \
    'sr' \
    'mcr' \
    'mcsr'
  do
    FOLDER="bench/$INSTANCE"
    mkdir "$FOLDER" 2>/dev/null || true
    echo "Bench instance $INSTANCE"
    pnpm exec 0x -D "$FOLDER" lib/test/index.js -i "$INSTANCE" "$FOOT_DISTANCE" --runTimes "$TIMES" 1>"$FOLDER/out.txt" 2>/dev/null
    sed -i "s|$(dirname "$PWD")/||g" "$FOLDER/flamegraph.html"
    echo "Done at: $FOLDER/flamegraph.html"
  done
fi

if [ -n "$CRITERIA" ]; then
  # Multi-criteria specific
  for INSTANCE in \
    'mcr' \
    'mcsr'
  do
    for CRITERIA in \
      '--fd' \
      '--bt' \
      # Might be very long...
      # '--fd --bt'
    do
      for DELAY in \
        '--delay-pos=1 --delay-neg=0' \
        '--delay-pos=2 --delay-neg=1' \
        '--delay-pos=3 --delay-neg=2' \
        # Might be very long...
        # '--fd --bt'
      do
        FOLDER="bench/$INSTANCE$(echo "$CRITERIA" | sed 's/ //g')$(echo "$DELAY" | sed -E 's/( ?--delay|=)//g')"
        mkdir "$FOLDER" 2>/dev/null || true
        echo "Bench instance $INSTANCE with criteria $CRITERIA and delays $DELAY"
        # shellcheck disable=SC2086
        pnpm exec 0x -D "$FOLDER" lib/test/index.js -i "$INSTANCE" "$FOOT_DISTANCE" $CRITERIA $DELAY --runTimes "$TIMES" 1>"$FOLDER/out.txt" 2>/dev/null
        sed -i "s|$(dirname "$PWD")/||g" "$FOLDER/flamegraph.html"
        echo "Done at: $FOLDER/flamegraph.html"
      done
    done
  done
fi

# UI doc https://github.com/davidmarkclements/0x/blob/master/docs/ui.md
