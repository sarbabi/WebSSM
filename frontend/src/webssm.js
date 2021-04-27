/**
 * Author: Saeed Arbabi
 * Date: 15-03-2021
 * change url (line 7) to set it to your python server address endpoint (leave it as it is if you're running backend on your own computer)
 */


import vtkSTLReader from 'vtk.js/Sources/IO/Geometry/STLReader';
import vtkSTLWriter from 'vtk.js/Sources/IO/Geometry/STLWriter';
import {create, all} from 'mathjs'
import vtkPoints from 'vtk.js/Sources/Common/Core/Points'
import vtkCellArray from 'vtk.js/Sources/Common/Core/CellArray'
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData'
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkConeSource from 'vtk.js/Sources/Filters/Sources/ConeSource';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';


//0-reading data the first loading
$.when($.ajax({
    url: "http://127.0.0.1:5000/readdata",
    async: false,
    success: function (csvdjsn) {
        const csvd = JSON.parse(csvdjsn)
        window['stddev1'] = $.csv.toArrays(csvd["stddev"]);

        window['basisMatrix1'] = $.csv.toArrays(csvd["basisMatrix"]);

        window['meanVector1'] = $.csv.toArrays(csvd["meanVector"]);

        window['meanShape1'] = $.csv.toArrays(csvd["meanShape"]);
    },
    dataType: "text",
    complete: function () {
    }
})).then(function(){

const url = "http://127.0.0.1:5000/surfacereconstructor"

//1- generate instance matrix point cloud
const math = create(all)

window["alpha1"] = Array(1).fill().map(() => Array(window['basisMatrix1'][0].length));
for (let i=0; i<window['basisMatrix1'][0].length; i++){
    window['alpha1'][0][i]=0
}

//create instance of the shape from the shape model parameters
function calculateInstanceMatrix(alpha, stddev, basisMatrix, meanVector, meanShape){
    var alpha_mul_stddev2 = math.dotMultiply(alpha, stddev); //1*16
    var basis_transposed2 = math.transpose(basisMatrix); //16*window['basisMatrix1'].length
    var alstd_mul_bastran2 = math.multiply(alpha_mul_stddev2, basis_transposed2);
    var alstd_mulbastran_add_meaVec2 = math.add(alstd_mul_bastran2,meanVector)
    var instance2 = math.add(alstd_mulbastran_add_meaVec2, math.reshape(meanShape, [1,basisMatrix.length]))
    return instance2;
}
var instancePoints2 = math.reshape(calculateInstanceMatrix(window['alpha1'], window['stddev1'], window['basisMatrix1'], window['meanVector1'], window['meanShape1']), [window['basisMatrix1'].length/3, 3])

//2-turn instance matrix to a vtk point cloud

window["writer1"] = vtkSTLWriter.newInstance()
window["blob1"] = 0
window["fileContents1"] = 0
function instanceMatrix2vtkPolydata(instancePoints, cntnr_nr){
    const pointArray = [];
    const cellArray = [];
    let points = null
    let pointCells = null;

    const polydata = vtkPolyData.newInstance();
    for (var i = 0; i < instancePoints.length; i++) {
        //Points
        pointArray.push(instancePoints[i][0]);
        pointArray.push(instancePoints[i][1]);
        pointArray.push(instancePoints[i][2]);
        //Cells
        cellArray.push(1);
        cellArray.push(i);
    }
    points = vtkPoints.newInstance({ values: Float32Array.from(pointArray) });
    pointCells = vtkCellArray.newInstance({ values: Uint16Array.from(cellArray) });
    polydata.setPoints(points);
    polydata.setVerts(pointCells);
    sendPointCloud(pointArray, cntnr_nr)
    return polydata
}
function assembleSurface(bufPoints, bufCells, bufNormals){
    const pointArray = [];
    const cellArray = [];
    const normalArray = [];

    let points = null
    let cells = null;
    let normals = null;

    const polydata = vtkPolyData.newInstance();

    for (var i = 0; i < bufPoints.length/3; i++) {
        //Points
        pointArray.push(bufPoints[i*3]);
        pointArray.push(bufPoints[i*3+1]);
        pointArray.push(bufPoints[i*3+2]);
    }
    for (var i = 0; i < bufCells.length/3; i++) {
        //Cells
        cellArray.push(3);
        cellArray.push(bufCells[i*3]);
        cellArray.push(bufCells[i*3+1]);
        cellArray.push(bufCells[i*3+2]);
    }
    for (var i = 0; i < bufNormals.length/3; i++) {
        //Points
        normalArray.push(bufNormals[i*3]);
        normalArray.push(bufNormals[i*3+1]);
        normalArray.push(bufNormals[i*3+2]);
    }

    points = vtkPoints.newInstance({ values: Float32Array.from(pointArray) });
    cells = vtkCellArray.newInstance({ values: Uint16Array.from(cellArray) });
    normals = vtkPoints.newInstance({ values: Float32Array.from(normalArray) });

    polydata.setPoints(points);
    polydata.setPolys(cells);
    polydata.getPointData().setNormals(normals)

    window['surface'] = polydata
    return polydata
}
var polyData = instanceMatrix2vtkPolydata(instancePoints2, 1)
window["polyDataTemp1"] = polyData
var sm_max_num = window['basisMatrix1'][0].length

//3-visualize point cloud
var instancePointsTemp;
function setupController(containerId){
    const controller = document.getElementsByClassName("controller"+containerId)[0]

    let selector_div = document.createElement("div")
    selector_div.setAttribute("id","selector_div"+containerId)
    selector_div.setAttribute("style", "position: absolute; background-color:gray; left: 0%; width: 100%; height: 5%; border: 0px solid #73AD21;")
    let selector = document.createElement("select")
    selector.setAttribute("style", "width:100%; height:95%;")
    selector.setAttribute("id", "selector"+containerId)
    selector.addEventListener("change", function(){
        refreshVisualization(window["polyDataTemp1"], window["polyDataTemp2"]);
    })
    let selector_option0 = document.createElement("option");
    selector_option0.value="0"
    selector_option0.selected
    selector_option0.label="Points"
    selector.appendChild(selector_option0)
    let selector_option1 = document.createElement("option");
    selector_option1.value="1"
    selector_option1.label="Surface"
    selector.appendChild(selector_option1)
    let selector_option2 = document.createElement("option");
    selector_option2.value="2"
    selector_option2.label="Wireframe"
    selector.appendChild(selector_option2)
    selector_div.appendChild(selector)

    let buttons_div = document.createElement("div")
    buttons_div.setAttribute("id","buttons_div"+containerId)
    buttons_div.setAttribute("style", "position: absolute; background-color:gray; top:5%;left: 0%; width: 100%; height: 5%; border: 0px solid #73AD21;")
    let btnMean = document.createElement("button")
    btnMean.id = "btnMean"+containerId
    btnMean.value = "Mean"
    btnMean.innerHTML="Mean"
    btnMean.setAttribute("style", "position: absolute; left: 0%; width: 50%; height: 100%;")
    btnMean.addEventListener("click",
        function (){
            for (let i=0; i<window["alpha"+containerId][0].length; i++){
                window[("alpha"+containerId)][0][i]=0
            }
            for(i=0;i<sm_max_num;i++){
                document.getElementById("rng_sm"+i+"_cntr"+containerId).value = 0
                document.getElementById("inp_sm"+i+"_cntr"+containerId).value = 0
            }

            instancePointsTemp = math.reshape(calculateInstanceMatrix(window[("alpha"+containerId)], window[("stddev"+containerId)], window[("basisMatrix"+containerId)], window[("meanVector"+containerId)], window[("meanShape"+containerId)]), [window[("basisMatrix"+containerId)].length/3, 3])
            window["polyDataTemp"+containerId] = instanceMatrix2vtkPolydata(instancePointsTemp, containerId)
            refreshVisualization(window["polyDataTemp1"]);
})
    buttons_div.appendChild(btnMean)
    let btnRnd = document.createElement("button")
    btnRnd.id = "btnRandom"+containerId
    btnRnd.value = "Random"
    btnRnd.innerText="Random"
    btnRnd.setAttribute("style", "position: absolute; left: 50%; width: 50%; height: 100%;")
    btnRnd.addEventListener("click",
        function (){
            for (let i=0; i<window["alpha"+containerId][0].length; i++){
                window[("alpha"+containerId)][0][i]=Math.random()*6-3
            }
            for(i=0;i<sm_max_num;i++){
                document.getElementById("rng_sm"+i+"_cntr"+containerId).value = window[("alpha"+containerId)][0][i]
                document.getElementById("inp_sm"+i+"_cntr"+containerId).value = window[("alpha"+containerId)][0][i]
            }
            instancePointsTemp = math.reshape(calculateInstanceMatrix(window[("alpha"+containerId)], window[("stddev"+containerId)], window[("basisMatrix"+containerId)], window[("meanVector"+containerId)], window[("meanShape"+containerId)]), [window[("basisMatrix"+containerId)].length/3, 3])
            window["polyDataTemp"+containerId] = instanceMatrix2vtkPolydata(instancePointsTemp, containerId)
            refreshVisualization(window["polyDataTemp1"]);
        })
    buttons_div.appendChild(btnRnd)

    let smodes_div = document.createElement("div")
    smodes_div.setAttribute("id", "smodes_div"+containerId)
    smodes_div.setAttribute("style", "position: absolute;overflow-y:scroll; background-color:gray; top:10%;left: 0%; width: 100%; height: 90%; border: 0px solid #73AD21;")

    var i;
    for (i = 0; i < sm_max_num; i++) {
        let smodes_div_1 = document.createElement("div")
        smodes_div_1 = setup_sm(containerId, i)
        smodes_div.appendChild(smodes_div_1)
    }

    controller.appendChild(selector_div)
    controller.appendChild(buttons_div)
    controller.appendChild(smodes_div)
}
function setup_sm(container_nr, sm_nr){
    let smode_div_i = document.createElement("div")
    smode_div_i.setAttribute("style", "position: absolute; background-color:white; top:"+sm_nr*10+"%; left: 0%; width: 100%; height: 10%; border: 0px solid #73AD21;")
    let sm_lbl = document.createElement("label")
    let sm_rng = document.createElement("input")
    sm_rng.setAttribute("id", "rng_"+"sm"+sm_nr+"_cntr"+container_nr)
    sm_rng.type = "range"
    let sm_input = document.createElement("input")
    sm_input.id = "inp_"+"sm"+sm_nr+"_cntr"+container_nr
    sm_input.type = "number"

    sm_lbl.setAttribute("for", "sm"+sm_nr+"_cntr"+container_nr)
    sm_lbl.setAttribute("text","shape mode "+sm_nr)
    sm_lbl.setAttribute("style", "position: absolute; top:30% ;left: 0%; width: 25%; height: 100%; border: 0px solid #73AD21;")
    sm_lbl.innerHTML = "shape mode "+sm_nr
    smode_div_i.appendChild(sm_lbl)

    sm_rng.min = "-3"
    sm_rng.max = "3"
    sm_rng.value = "0"
    sm_rng.step = "0.5"
    sm_rng.addEventListener('input', (e) => {
        sm_input.value = sm_rng.value;
        window[("alpha"+container_nr)][0][sm_nr] = sm_rng.value
        instancePointsTemp = math.reshape(calculateInstanceMatrix(window[("alpha"+container_nr)], window[("stddev"+container_nr)], window[("basisMatrix"+container_nr)], window[("meanVector"+container_nr)], window[("meanShape"+container_nr)]), [window[("basisMatrix"+container_nr)].length/3, 3])
        window["polyDataTemp"+container_nr] = instanceMatrix2vtkPolydata(instancePointsTemp, container_nr)
        refreshVisualization(window["polyDataTemp1"]);
    });
    sm_rng.setAttribute("style", "position: absolute; left: 25%; width: 60%; height: 100%; border: 0px solid #73AD21;")
    smode_div_i.appendChild(sm_rng)

    sm_input.value = "0"
    sm_input.min = "-3"
    sm_input.max = "3"
    sm_input.step = "0.5"
    sm_input.addEventListener('input', function (){
        sm_rng.value = sm_input.value;
        window[("alpha"+container_nr)][0][sm_nr] = sm_rng.value
        instancePointsTemp = math.reshape(calculateInstanceMatrix(window[("alpha"+container_nr)], window[("stddev"+container_nr)], window[("basisMatrix"+container_nr)], window[("meanVector"+container_nr)], window[("meanShape"+container_nr)]), [window[("basisMatrix"+container_nr)].length/3, 3])
        window["polyDataTemp"+container_nr] = instanceMatrix2vtkPolydata(instancePointsTemp, container_nr)
        refreshVisualization(window["polyDataTemp1"]);
        }, true)
    sm_input.setAttribute("style", "position: absolute; left: 85%; width: 15%; height: 100%; border: 0px solid #73AD21;")
    smode_div_i.appendChild(sm_input)
    return smode_div_i
}
function setupContainer(containerId, containerHeight){
    const container = document.createElement("div")
    container.setAttribute("class","container"+containerId)
    container.setAttribute("style", "position: absolute; top:"+(containerId-1)*containerHeight*100+"%;width: 100%; height: "+containerHeight*100+"%; border: 2px solid #73AD21;")

    document.body.append(container)

    //add controller
    const controller = document.createElement("div")
    controller.setAttribute("class","controller"+containerId)
    controller.setAttribute("style", "position: absolute; background-color:white; left: 0%; width: 25%; height: 100%; border: 0px solid #73AD21;")
    container.appendChild(controller)
    const canvas = document.createElement("div")
    canvas.setAttribute("class","canvas"+containerId)
    canvas.setAttribute("style", "position: absolute; left:25%; width: 75%; height: 100%; border: 0px solid #73AD21;")

    const a = window.document.createElement("a")
    a.setAttribute("id", "a"+containerId)
    a.href = 'salam'
    a.download = 'shape'+containerId+'.stl'
    a.text = 'Download'
    a.style.position = 'absolute'
    a.style.left = '50%'
    a.style.bottom = '10px'
    canvas.appendChild(a)
    a.style.background = 'white'
    a.style.padding = '5px'
    container.appendChild(canvas)
}
function setupRendering(containerId){
    var renderWindow = vtkRenderWindow.newInstance();
    var renderer = vtkRenderer.newInstance({ background: [0.2, 0.3, 0.4] });
    renderWindow.addRenderer(renderer);

    var coneSource = vtkConeSource.newInstance({ height: 1.0 });
    var mapper = vtkMapper.newInstance();
    mapper.setInputConnection(coneSource.getOutputPort());
    var actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setPointSize(3);

    var openglRenderWindow = vtkOpenGLRenderWindow.newInstance();
    renderWindow.addView(openglRenderWindow);
    var canvas = document.getElementsByClassName("canvas"+containerId)[0]
    openglRenderWindow.setContainer(canvas)
    const { width, height } = canvas.getBoundingClientRect();
    openglRenderWindow.setSize(width, height);

    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);
    interactor.initialize();
    interactor.bindEvents(canvas);

    interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());

    return [renderWindow, renderer, mapper, actor];
}
var renderWindow1, renderer1, mapper1, actor1;
function prepareScene() {
    setupContainer(1, 1)
    var rendering1 = setupRendering(1)
    renderWindow1 = rendering1[0]
    renderer1 = rendering1[1]
    mapper1 = rendering1[2]
    actor1 = rendering1[3]
}
function visualise(polydata1){
    if(document.getElementById("selector1").value==0)
        mapper1.setInputData(polydata1);
    else
        mapper1.setInputData(window["asmSurface1"])

    renderer1.addActor(actor1);
    renderer1.resetCamera();
    renderWindow1.render();
}
function sendPointCloud(pointArray, cntnr_nr){
    // POST
    var current = new Date()
    fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            "array":pointArray, "cntr_nr":cntnr_nr
        }        )
    }).then(function (response) {
        current = new Date()
        return response.text();
    }).then(function (text) {
        window["surface"+cntnr_nr] = JSON.parse(text);
        window["asmSurface"+cntnr_nr] = assembleSurface(window["surface"+cntnr_nr]["points"], window["surface"+cntnr_nr]["cells"], window["surface"+cntnr_nr]["normals"])
        window["writer"+cntnr_nr] = vtkSTLWriter.newInstance()
        window["writer"+cntnr_nr].setInputData(window["asmSurface"+cntnr_nr]);
        window["fileContents"+cntnr_nr] = window["writer"+cntnr_nr].getOutputData();
        window["blob"+cntnr_nr] = new Blob([window["fileContents"+cntnr_nr]], {type: 'application/octet-steam',});
        document.getElementById("a"+cntnr_nr).href = window.URL.createObjectURL(window["blob"+cntnr_nr], {
            type: 'application/octet-steam',});
        visualise(window["polyDataTemp1"]);
    }).then(result => console.log(result))
        .catch(error => console.log('error', error));
}
const reader = vtkSTLReader.newInstance();
prepareScene()
setupController(1)
visualise(polyData)

//4-interactive working with shape modes
function refreshVisualization(polyDataTemp1){
    visualise(polyDataTemp1);
}

});