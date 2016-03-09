#!/bin/bash

psql -U postgres -d serviceorderhub -f /dump.sql
