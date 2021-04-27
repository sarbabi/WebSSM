from flask import Flask, jsonify, request
import vtk
from reconstructSurface import ReconstructSurface
from vtk.util.misc import vtkGetDataRoot
from datetime import datetime
import json
from flask_cors import CORS


#if you're deploying to a server, you might want to change the host_ip something like '0.0.0.0'
host_ip = '127.0.0.1'

VTK_DATA_ROOT = vtkGetDataRoot()

app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins":"*"}})

#this is the piece of code that serves the frontend everytime a shape mode changes
@app.route('/surfacereconstructor', methods=['GET', 'POST'])
def surfacereconstructor():
    if request.method == 'POST':
        points_array = request.get_json()["array"]
        cntr_nr = request.get_json()["cntr_nr"]
        recsurf = ReconstructSurface()
        recsurf.pts = points_array
        recsurf.cntr_nr = cntr_nr
        cf = recsurf.reconstruct()
        surface = cf.GetOutput()
        pts,cls,nms = extr_surf_vals(surface)
        response = {"points":pts, "cells":cls, "normals":nms}
        return response

#this part serves the frontend for the first time it's loading
@app.route('/readdata', methods=['GET'])
def readdata():
    if request.method == 'GET':
        csv_dict = {}
        with open('data/stddev.csv', 'r') as f:
            csv_dict['stddev'] = f.read()
        with open('data/basisMatrix.csv', 'r') as f:
            csv_dict['basisMatrix'] = f.read()
        with open('data/meanVector.csv', 'r') as f:
            csv_dict['meanVector'] = f.read()
        with open('data/meanShape.csv', 'r') as f:
            csv_dict['meanShape'] = f.read()
        return jsonify(csv_dict)

#this function extracts the vtk surface data to be sent to frontend
def extr_surf_vals(polyData):
    numCells = polyData.GetNumberOfPolys()
    numPoints = polyData.GetNumberOfPoints()

    points = [0.0 for i in range(numPoints*3)]
    normals = [0.0 for i in range(numPoints*3)]
    cells = [0 for i in range(numCells*3)]
    coords = [0.0, 0.0, 0.0]

    cellArray = polyData.GetPolys()
    cellArray.InitTraversal()
    for i in range(numCells):
        idList = vtk.vtkIdList()
        cellArray.GetNextCell(idList)
        for j in range(idList.GetNumberOfIds()):
            id = idList.GetId(j)
            cells[i*3+j] = id

            polyData.GetPoint(id, coords)
            points[id * 3 + 0] = coords[0]
            points[id * 3 + 1] = coords[1]
            points[id * 3 + 2] = coords[2]

    normalArray = polyData.GetPointData().GetNormals()
    for i in range(normalArray.GetNumberOfTuples()):
        normalArray.GetTuple(i, coords)

        normals[i * 3 + 0] = coords[0]
        normals[i * 3 + 1] = coords[1]
        normals[i * 3 + 2] = coords[2]
    return (points, cells, normals)

if __name__ == "__main__":
    app.run(host=host_ip)